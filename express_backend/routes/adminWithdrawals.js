// File: express_backend/routes/adminWithdrawals.js
// FIXED:
//  1. Approve → deducts from escrowLocked (funds were moved there on request creation)
//  2. Decline → releases escrowLocked back to available balance
//  3. Correct notification enum types

import express from 'express';
import mongoose from 'mongoose';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

async function createNotification(userId, type, title, message, data = {}, priority = 'medium') {
  const VALID = [
    'deposit_confirmed', 'withdrawal_rejected', 'withdrawal_approved',
    'campaign_created', 'campaign_approved', 'campaign_rejected',
    'payment_received', 'payment_sent', 'system_alert', 'reminder',
    'welcome', 'password_reset', 'email_verified', 'two_factor_enabled',
    'two_factor_disabled', 'profile_updated', 'security_alert', 'login_alert',
  ];
  try {
    const notificationType = VALID.includes(type) ? type : 'system_alert';
    await new Notification({ user: userId, type: notificationType, title, message, priority, data, inAppDelivered: true }).save();
  } catch (err) {
    console.error('Notification error (non-fatal):', err.message);
  }
}

/**
 * GET /api/admin/withdrawals
 * All withdrawals with optional filters: status, currency, search
 */
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const { status, currency, search } = req.query;
    const conditions = {};

    if (status && ['pending', 'completed', 'declined'].includes(status)) conditions.status = status;
    if (currency && ['NGN', 'USDT'].includes(currency)) conditions.currency = currency;

    if (search) {
      const users = await mongoose.model('User').find({
        $or: [
          { email:     { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName:  { $regex: search, $options: 'i' } },
          { company:   { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      conditions.user = { $in: users.map((u) => u._id) };
    }

    const withdrawals = await WithdrawalRequest.find(conditions)
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: 'email firstName lastName company role',
        model: 'User',
      });

    res.json(withdrawals.map((w) => ({
      id:            w._id,
      user: {
        id:    w.user?._id,
        email: w.user?.email || '',
        name:  w.user?.firstName
          ? `${w.user.firstName}${w.user.lastName ? ' ' + w.user.lastName : ''}`
          : w.user?.company || 'Unknown',
        role:  w.user?.role || '',
      },
      amount:        w.amount,
      currency:      w.currency || 'NGN',
      paymentMethod: w.paymentMethod,
      // Bank
      bankName:      w.bank_name,
      accountNumber: w.account_number,
      accountName:   w.account_name,
      // USDT
      usdtAddress:   w.usdt_address,
      usdtNetwork:   w.usdt_network,
      // Status
      status:        w.status,
      declineReason: w.declineReason,
      createdAt:     w.createdAt,
      processedAt:   w.processedAt,
      txHash:        w.txHash,
      reference:     w.reference,
    })));
  } catch (err) {
    console.error('adminWithdrawals GET:', err);
    res.status(500).json({ error: 'Failed to load withdrawals.' });
  }
});

/**
 * GET /api/admin/withdrawals/pending
 */
router.get('/pending', requireAdminAuth, async (req, res) => {
  try {
    const list = await WithdrawalRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('user', 'email firstName lastName company role');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load pending withdrawals.' });
  }
});

/**
 * POST /api/admin/withdrawals/:id/approve
 * Mark withdrawal as paid.
 * ─── FLOW ────────────────────────────────────────────────────────────────────
 *  When user created the withdrawal request, their available balance was moved
 *  into escrowLocked. Admin "Mark Paid" means the real-world payment has been
 *  sent. We now permanently remove those funds from escrowLocked.
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.post('/:id/approve', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    const withdrawal = await WithdrawalRequest.findById(id).populate('user');
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed.' });

    const wallet = await Wallet.findOne({ user: withdrawal.user._id });
    if (!wallet) return res.status(404).json({ error: 'User wallet not found.' });

    // ── Deduct from escrow (funds were locked there when request was created) ──
    if (withdrawal.currency === 'NGN') {
      if (wallet.escrowLocked < withdrawal.amount) {
        return res.status(400).json({ error: 'Escrow funds mismatch. Contact support.' });
      }
      wallet.escrowLocked -= withdrawal.amount;
    } else {
      if (wallet.usdtEscrowLocked < withdrawal.amount) {
        return res.status(400).json({ error: 'USDT escrow funds mismatch. Contact support.' });
      }
      wallet.usdtEscrowLocked -= withdrawal.amount;
    }
    await wallet.save();

    // ── Update withdrawal ──────────────────────────────────────────────────
    withdrawal.status      = 'completed';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    if (txHash) withdrawal.txHash = txHash;
    await withdrawal.save();

    // ── Record transaction ─────────────────────────────────────────────────
    await Transaction.create({
      user:      withdrawal.user._id,
      type:      'withdrawal',
      amount:    withdrawal.amount,
      currency:  withdrawal.currency,
      status:    'completed',
      note:      `Withdrawal completed by admin`,
      reference: withdrawal.reference || withdrawal._id.toString(),
      metadata:  { withdrawalId: withdrawal._id, paymentMethod: withdrawal.paymentMethod, processedBy: req.user._id, txHash },
    });

    // ── Notify user ────────────────────────────────────────────────────────
    const amtFmt = withdrawal.currency === 'NGN'
      ? `₦${withdrawal.amount.toLocaleString()}`
      : `${withdrawal.amount} USDT`;

    await createNotification(
      withdrawal.user._id,
      'withdrawal_approved',
      'Withdrawal Paid',
      `Your withdrawal of ${amtFmt} has been sent to your ${withdrawal.currency === 'NGN' ? 'bank account' : 'USDT wallet'}.`,
      { withdrawalId: withdrawal._id, amount: withdrawal.amount, currency: withdrawal.currency, status: 'completed', txHash },
      'high',
    );

    res.json({
      success: true,
      message: 'Withdrawal marked as paid',
      withdrawal: { id: withdrawal._id, status: withdrawal.status, processedAt: withdrawal.processedAt },
    });
  } catch (err) {
    console.error('approve withdrawal:', err);
    res.status(500).json({ error: 'Failed to approve withdrawal: ' + err.message });
  }
});

/**
 * POST /api/admin/withdrawals/:id/decline
 * Decline request and release the escrow-locked funds back to user's available balance.
 */
router.post('/:id/decline', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const withdrawal = await WithdrawalRequest.findById(id).populate('user');
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed.' });

    const wallet = await Wallet.findOne({ user: withdrawal.user._id });
    if (!wallet) return res.status(404).json({ error: 'User wallet not found.' });

    // ── Release escrow back to available balance ───────────────────────────
    if (withdrawal.currency === 'NGN') {
      await wallet.releaseEscrowNGN(withdrawal.amount);
    } else {
      await wallet.releaseEscrowUSDT(withdrawal.amount);
    }

    // ── Update withdrawal ──────────────────────────────────────────────────
    withdrawal.status        = 'declined';
    withdrawal.declineReason = reason || 'Declined by admin';
    withdrawal.processedAt   = new Date();
    withdrawal.processedBy   = req.user._id;
    await withdrawal.save();

    // ── Record transaction ─────────────────────────────────────────────────
    await Transaction.create({
      user:     withdrawal.user._id,
      type:     'withdrawal',
      amount:   withdrawal.amount,
      currency: withdrawal.currency,
      status:   'failed',
      note:     `Withdrawal declined: ${reason || 'No reason provided'}`,
      metadata: { withdrawalId: withdrawal._id, declinedBy: req.user._id, reason },
    });

    // ── Notify user ────────────────────────────────────────────────────────
    const amtFmt = withdrawal.currency === 'NGN'
      ? `₦${withdrawal.amount.toLocaleString()}`
      : `${withdrawal.amount} USDT`;

    await createNotification(
      withdrawal.user._id,
      'withdrawal_rejected',
      'Withdrawal Declined',
      `Your withdrawal of ${amtFmt} was declined${reason ? `: ${reason}` : '. Contact support for more information.'}. The funds have been returned to your wallet.`,
      { withdrawalId: withdrawal._id, amount: withdrawal.amount, currency: withdrawal.currency, status: 'declined', reason },
      'high',
    );

    res.json({
      success: true,
      message: 'Withdrawal declined, funds returned to user',
      withdrawal: { id: withdrawal._id, status: withdrawal.status, processedAt: withdrawal.processedAt, declineReason: withdrawal.declineReason },
    });
  } catch (err) {
    console.error('decline withdrawal:', err);
    res.status(500).json({ error: 'Failed to decline withdrawal: ' + err.message });
  }
});

/**
 * DELETE /api/admin/withdrawals/:id
 */
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (withdrawal.status === 'pending') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (withdrawal.createdAt > thirtyDaysAgo) {
        return res.status(400).json({ error: 'Cannot delete recent pending withdrawals. Decline them instead.' });
      }
    }

    await WithdrawalRequest.deleteOne({ _id: id });
    res.json({ success: true, message: 'Withdrawal deleted', id });
  } catch (err) {
    console.error('delete withdrawal:', err);
    res.status(500).json({ error: 'Failed to delete withdrawal.' });
  }
});

/**
 * GET /api/admin/withdrawals/stats
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await WithdrawalRequest.aggregate([
      { $group: { _id: { status: '$status', currency: '$currency' }, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $group: { _id: '$_id.status', currencies: { $push: { currency: '$_id.currency', count: '$count', totalAmount: '$totalAmount' } }, totalCount: { $sum: '$count' } } },
    ]);

    const pendingCount = await WithdrawalRequest.countDocuments({ status: 'pending' });
    const formatted = {
      pending:   { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
      completed: { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
      declined:  { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
      pendingTotal: pendingCount,
    };

    stats.forEach((stat) => {
      const s = stat._id;
      if (formatted[s]) {
        formatted[s].total = stat.totalCount;
        stat.currencies.forEach((c) => {
          if (formatted[s][c.currency]) {
            formatted[s][c.currency].count  = c.count;
            formatted[s][c.currency].amount = c.totalAmount;
          }
        });
      }
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawal statistics.' });
  }
});

/**
 * GET /api/admin/withdrawals/user/:userId
 */
router.get('/user/:userId', requireAdminAuth, async (req, res) => {
  try {
    const list = await WithdrawalRequest.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'email firstName lastName');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user withdrawals.' });
  }
});

export default router;

// // File: express_backend/routes/adminWithdrawals.js

// import express from 'express';
// import mongoose from 'mongoose';
// import WithdrawalRequest from '../models/WithdrawalRequest.js';
// import Wallet from '../models/Wallet.js';
// import Notification from '../models/Notification.js';
// import Transaction from '../models/Transaction.js';
// import { requireAdminAuth } from '../middleware/adminAuth.js';

// const router = express.Router();

// // Helper function to create notifications
// async function createNotification(userId, type, title, message, data = {}, priority = 'medium') {
//   try {
//     const notification = new Notification({
//       user: userId,
//       type,
//       title,
//       message,
//       priority,
//       data,
//       inAppDelivered: true
//     });
//     await notification.save();
//     return notification;
//   } catch (err) {
//     console.error('Error creating notification:', err);
//   }
// }

// /**
//  * GET /api/admin/withdrawals
//  * Get all withdrawals with filters
//  * Query params:
//  *   status: pending|completed|declined
//  *   currency: NGN|USDT
//  *   search: search term for user email/name
//  */
// router.get('/', requireAdminAuth, async (req, res) => {
//   try {
//     const { status, currency, search } = req.query;
    
//     // Build query conditions
//     const conditions = {};
    
//     // Status filter
//     if (status && ['pending', 'completed', 'declined'].includes(status)) {
//       conditions.status = status;
//     }
    
//     // Currency filter
//     if (currency && ['NGN', 'USDT'].includes(currency)) {
//       conditions.currency = currency;
//     }
    
//     // Search filter (if provided)
//     if (search) {
//       const userConditions = {
//         $or: [
//           { email: { $regex: search, $options: 'i' } },
//           { firstName: { $regex: search, $options: 'i' } },
//           { lastName: { $regex: search, $options: 'i' } },
//           { company: { $regex: search, $options: 'i' } }
//         ]
//       };
      
//       // Find users matching search first
//       const users = await mongoose.model('User').find(userConditions).select('_id');
//       conditions.user = { $in: users.map(u => u._id) };
//     }
    
//     // Fetch withdrawals with populated user info
//     const withdrawals = await WithdrawalRequest.find(conditions)
//       .sort({ createdAt: -1 })
//       .populate({
//         path: 'user',
//         select: 'email firstName lastName company role paymentMethod usdtAddress usdtNetwork payBankName payAccountNumber payAccountName',
//         model: 'User'
//       });

//     // Format response
//     const mapped = withdrawals.map(w => ({
//       id: w._id,
//       user: {
//         id: w.user?._id,
//         email: w.user?.email || '',
//         name: w.user?.firstName 
//           ? `${w.user.firstName}${w.user.lastName ? ' ' + w.user.lastName : ''}`
//           : w.user?.company || 'Unknown',
//         role: w.user?.role || ''
//       },
//       amount: w.amount,
//       currency: w.currency || 'NGN',
//       paymentMethod: w.paymentMethod,
//       // Bank details
//       bankName: w.bank_name,
//       accountNumber: w.account_number,
//       accountName: w.account_name,
//       // USDT details
//       usdtAddress: w.usdt_address,
//       usdtNetwork: w.usdt_network,
//       // Status and dates
//       status: w.status,
//       declineReason: w.declineReason,
//       createdAt: w.createdAt,
//       processedAt: w.processedAt,
//       txHash: w.txHash,
//       reference: w.reference
//     }));

//     res.json(mapped);
//   } catch (err) {
//     console.error('Error fetching withdrawals:', err);
//     res.status(500).json({ error: 'Failed to load withdrawals.' });
//   }
// });

// /**
//  * GET /api/admin/withdrawals/pending
//  * List all pending withdrawals (maintained for backward compatibility)
//  */
// router.get('/pending', requireAdminAuth, async (req, res) => {
//   try {
//     const withdrawals = await WithdrawalRequest.find({ status: 'pending' })
//       .sort({ createdAt: -1 })
//       .populate({
//         path: 'user',
//         select: 'email firstName lastName company role'
//       });

//     res.json(withdrawals);
//   } catch (err) {
//     console.error('Error fetching pending withdrawals:', err);
//     res.status(500).json({ error: 'Failed to load pending withdrawals.' });
//   }
// });

// /**
//  * POST /api/admin/withdrawals/:id/approve
//  * Approve a pending withdrawal
//  */
// router.post('/:id/approve', requireAdminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { txHash } = req.body; // Optional transaction hash for USDT payouts
    
//     const withdrawal = await WithdrawalRequest.findById(id).populate('user');
//     if (!withdrawal) {
//       return res.status(404).json({ error: 'Withdrawal not found' });
//     }
    
//     if (withdrawal.status !== 'pending') {
//       return res.status(400).json({ error: 'Withdrawal already processed' });
//     }

//     const wallet = await Wallet.findOne({ user: withdrawal.user._id });
//     if (!wallet) {
//       return res.status(404).json({ error: 'User wallet not found' });
//     }

//     // Verify funds are still in escrow
//     if (withdrawal.currency === 'NGN') {
//       if (wallet.escrowLocked < withdrawal.amount) {
//         return res.status(400).json({ error: 'Insufficient escrow funds' });
//       }
//       // Deduct from escrow permanently
//       wallet.escrowLocked -= withdrawal.amount;
//     } else {
//       if (wallet.usdtEscrowLocked < withdrawal.amount) {
//         return res.status(400).json({ error: 'Insufficient USDT escrow funds' });
//       }
//       // Deduct from escrow permanently
//       wallet.usdtEscrowLocked -= withdrawal.amount;
//     }
    
//     await wallet.save();

//     // Update withdrawal status
//     withdrawal.status = 'completed';
//     withdrawal.processedAt = new Date();
//     withdrawal.processedBy = req.user._id;
//     if (txHash) withdrawal.txHash = txHash;
//     await withdrawal.save();

//     // Record transaction
//     await Transaction.create({
//       user: withdrawal.user._id,
//       type: 'withdrawal',
//       amount: withdrawal.amount,
//       currency: withdrawal.currency,
//       status: 'completed',
//       note: `Withdrawal completed by admin`,
//       reference: withdrawal.reference || withdrawal._id.toString(),
//       metadata: {
//         withdrawalId: withdrawal._id,
//         paymentMethod: withdrawal.paymentMethod,
//         processedBy: req.user._id,
//         txHash
//       }
//     });

//     // Create notification for completed withdrawal
//     const amountFormatted = withdrawal.currency === 'NGN' 
//       ? `₦${withdrawal.amount.toLocaleString()}`
//       : `${withdrawal.amount} USDT`;
    
//     await createNotification(
//       withdrawal.user._id,
//       'withdrawal_processed',
//       'Withdrawal Completed',
//       `Your withdrawal of ${amountFormatted} has been processed successfully.`,
//       {
//         withdrawalId: withdrawal._id,
//         amount: withdrawal.amount,
//         currency: withdrawal.currency,
//         status: 'completed',
//         txHash
//       },
//       'high'
//     );

//     res.json({ 
//       success: true, 
//       message: 'Withdrawal approved successfully',
//       withdrawal: {
//         id: withdrawal._id,
//         status: withdrawal.status,
//         processedAt: withdrawal.processedAt
//       }
//     });
//   } catch (err) {
//     console.error('Error approving withdrawal:', err);
//     res.status(500).json({ error: 'Failed to approve withdrawal.' });
//   }
// });

// /**
//  * POST /api/admin/withdrawals/:id/decline
//  * Decline a pending withdrawal and release funds back to user
//  */
// router.post('/:id/decline', requireAdminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body;
    
//     const withdrawal = await WithdrawalRequest.findById(id).populate('user');
//     if (!withdrawal) {
//       return res.status(404).json({ error: 'Withdrawal not found' });
//     }
    
//     if (withdrawal.status !== 'pending') {
//       return res.status(400).json({ error: 'Withdrawal already processed' });
//     }

//     const wallet = await Wallet.findOne({ user: withdrawal.user._id });
//     if (!wallet) {
//       return res.status(404).json({ error: 'User wallet not found' });
//     }

//     // Release funds back from escrow
//     if (withdrawal.currency === 'NGN') {
//       await wallet.releaseEscrowNGN(withdrawal.amount);
//     } else {
//       await wallet.releaseEscrowUSDT(withdrawal.amount);
//     }

//     // Update withdrawal status
//     withdrawal.status = 'declined';
//     withdrawal.declineReason = reason || 'Declined by admin';
//     withdrawal.processedAt = new Date();
//     withdrawal.processedBy = req.user._id;
//     await withdrawal.save();

//     // Record transaction
//     await Transaction.create({
//       user: withdrawal.user._id,
//       type: 'withdrawal',
//       amount: withdrawal.amount,
//       currency: withdrawal.currency,
//       status: 'failed',
//       note: `Withdrawal declined: ${reason || 'No reason provided'}`,
//       metadata: {
//         withdrawalId: withdrawal._id,
//         declinedBy: req.user._id,
//         reason
//       }
//     });

//     // Create notification for declined withdrawal
//     const amountFormatted = withdrawal.currency === 'NGN' 
//       ? `₦${withdrawal.amount.toLocaleString()}`
//       : `${withdrawal.amount} USDT`;
    
//     await createNotification(
//       withdrawal.user._id,
//       'withdrawal_rejected',
//       'Withdrawal Declined',
//       `Your withdrawal request of ${amountFormatted} has been declined. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
//       {
//         withdrawalId: withdrawal._id,
//         amount: withdrawal.amount,
//         currency: withdrawal.currency,
//         status: 'declined',
//         reason
//       },
//       'high'
//     );

//     res.json({ 
//       success: true, 
//       message: 'Withdrawal declined',
//       withdrawal: {
//         id: withdrawal._id,
//         status: withdrawal.status,
//         processedAt: withdrawal.processedAt,
//         declineReason: withdrawal.declineReason
//       }
//     });
//   } catch (err) {
//     console.error('Error declining withdrawal:', err);
//     res.status(500).json({ error: 'Failed to decline withdrawal.' });
//   }
// });

// /**
//  * DELETE /api/admin/withdrawals/:id
//  * Permanently remove a withdrawal record (only for non-pending or old records)
//  */
// router.delete('/:id', requireAdminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const withdrawal = await WithdrawalRequest.findById(id);
    
//     if (!withdrawal) {
//       return res.status(404).json({ error: 'Withdrawal not found' });
//     }

//     // Only allow deletion of completed/declined withdrawals, or very old pending ones
//     if (withdrawal.status === 'pending') {
//       // Check if it's older than 30 days
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
//       if (withdrawal.createdAt > thirtyDaysAgo) {
//         return res.status(400).json({ 
//           error: 'Cannot delete recent pending withdrawals. Consider declining them instead.' 
//         });
//       }
//     }

//     await WithdrawalRequest.deleteOne({ _id: id });
    
//     res.json({ 
//       success: true, 
//       message: 'Withdrawal deleted successfully',
//       id 
//     });
//   } catch (err) {
//     console.error('Error deleting withdrawal:', err);
//     res.status(500).json({ error: 'Failed to delete withdrawal.' });
//   }
// });

// /**
//  * GET /api/admin/withdrawals/stats
//  * Get withdrawal statistics for dashboard
//  */
// router.get('/stats', requireAdminAuth, async (req, res) => {
//   try {
//     const stats = await WithdrawalRequest.aggregate([
//       {
//         $group: {
//           _id: {
//             status: '$status',
//             currency: '$currency'
//           },
//           count: { $sum: 1 },
//           totalAmount: { $sum: '$amount' }
//         }
//       },
//       {
//         $group: {
//           _id: '$_id.status',
//           currencies: {
//             $push: {
//               currency: '$_id.currency',
//               count: '$count',
//               totalAmount: '$totalAmount'
//             }
//           },
//           totalCount: { $sum: '$count' },
//           totalAmountAll: { $sum: '$totalAmount' }
//         }
//       }
//     ]);

//     // Get pending count for quick access
//     const pendingCount = await WithdrawalRequest.countDocuments({ status: 'pending' });

//     // Format for easier consumption
//     const formatted = {
//       pending: { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
//       completed: { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
//       declined: { NGN: { count: 0, amount: 0 }, USDT: { count: 0, amount: 0 }, total: 0 },
//       pendingTotal: pendingCount
//     };

//     stats.forEach(stat => {
//       const status = stat._id;
//       stat.currencies.forEach(curr => {
//         if (formatted[status] && formatted[status][curr.currency]) {
//           formatted[status][curr.currency].count = curr.count;
//           formatted[status][curr.currency].amount = curr.totalAmount;
//         }
//       });
//       formatted[status].total = stat.totalCount;
//     });

//     res.json(formatted);
//   } catch (err) {
//     console.error('Error fetching withdrawal stats:', err);
//     res.status(500).json({ error: 'Failed to fetch withdrawal statistics.' });
//   }
// });

// /**
//  * GET /api/admin/withdrawals/user/:userId
//  * Get all withdrawals for a specific user
//  */
// router.get('/user/:userId', requireAdminAuth, async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     const withdrawals = await WithdrawalRequest.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .populate('user', 'email firstName lastName');

//     res.json(withdrawals);
//   } catch (err) {
//     console.error('Error fetching user withdrawals:', err);
//     res.status(500).json({ error: 'Failed to load user withdrawals.' });
//   }
// });

// export default router;