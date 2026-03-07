// File: express_backend/routes/adminDeposits.js (updated without transactions)

import express from 'express';
import mongoose from 'mongoose';
import { addMonths } from 'date-fns';
import DepositRequest from '../models/DepositRequest.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import path from 'node:path';
import fs from 'node:fs/promises';

const router = express.Router();

// Helper function to create notifications with valid enum values
async function createNotification(userId, type, title, message, data = {}, priority = 'medium') {
  try {
    // Map the type to valid enum values from your Notification model
    const validTypes = [
      'deposit_confirmed',
      'withdrawal_rejected', 
      'withdrawal_approved',
      'campaign_created',
      'campaign_approved',
      'campaign_rejected',
      'payment_received',
      'payment_sent',
      'system_alert',
      'reminder',
      'welcome',
      'password_reset',
      'email_verified',
      'two_factor_enabled',
      'two_factor_disabled',
      'profile_updated',
      'security_alert',
      'login_alert'
    ];
    
    // Use a fallback if type not in valid list
    const notificationType = validTypes.includes(type) ? type : 'system_alert';
    
    const notification = new Notification({
      user: userId,
      type: notificationType,
      title,
      message,
      priority,
      data,
      inAppDelivered: true
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    // Don't throw - notification failures shouldn't break main flow
  }
}

/**
 * GET /api/admin/deposits
 * Get all deposits with filters
 * Query params:
 *   status: pending|approved|rejected
 *   currency: NGN|USDT
 *   search: search term for user email/name
 */
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const { status, currency, search } = req.query;
    
    // Build query conditions
    const conditions = {};
    
    // Status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      conditions.status = status;
    }
    
    // Currency filter
    if (currency && ['NGN', 'USDT'].includes(currency)) {
      conditions.currency = currency;
    }
    
    // Search filter (if provided)
    if (search) {
      const userConditions = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ]
      };
      
      // Find users matching search first
      const users = await mongoose.model('User').find(userConditions).select('_id');
      if (users.length > 0) {
        conditions.user = { $in: users.map(u => u._id) };
      } else {
        // If no users found, return empty array
        return res.json([]);
      }
    }
    
    // Fetch deposits with populated user info
    const deposits = await DepositRequest.find(conditions)
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: 'email firstName lastName company role',
        model: 'User'
      });
    
    // Format response
    const formatted = deposits.map(d => ({
      id: d._id,
      user: {
        id: d.user?._id,
        email: d.user?.email || '',
        name: d.user?.firstName 
          ? `${d.user.firstName}${d.user.lastName ? ' ' + d.user.lastName : ''}`
          : d.user?.company || 'Unknown',
        role: d.user?.role || ''
      },
      amount: d.amount,
      currency: d.currency || 'NGN',
      paymentMethod: d.paymentMethod,
      receiptUrl: d.receiptUrl,
      metadata: d.metadata || {},
      txHash: d.metadata?.txHash,
      network: d.metadata?.network,
      fromAddress: d.fromAddress,
      reference: d.reference,
      status: d.status,
      adminNotes: d.adminNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      processedAt: d.processedAt,
      processedBy: d.processedBy
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching deposits:', err);
    res.status(500).json({ error: 'Failed to load deposits.' });
  }
});

/**
 * GET /api/admin/deposits/pending
 * List all pending deposit requests (maintained for backward compatibility)
 */
router.get('/pending', requireAdminAuth, async (req, res) => {
  try {
    const list = await DepositRequest
      .find({ status: 'pending' })
      .populate('user', 'email firstName lastName company role')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load pending deposits.' });
  }
});

/**
 * POST /api/admin/deposits/:id/verify
 * Body: { action: 'approve'|'reject', reason?: string }
 */
router.post('/:id/verify', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    const dr = await DepositRequest.findById(id).populate('user');
    if (!dr) return res.status(404).json({ error: 'Deposit request not found.' });
    
    if (dr.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit already processed.' });
    }

    const adminId = req.user._id;
    const amountFormatted = dr.currency === 'NGN' 
      ? `₦${dr.amount.toLocaleString()}`
      : `${dr.amount} USDT`;

    if (action === 'approve') {
      // Update deposit status
      dr.status = 'approved';
      dr.processedAt = new Date();
      dr.processedBy = adminId;
      await dr.save();

      // Get or create wallet
      let wallet = await Wallet.findOne({ user: dr.user._id });
      if (!wallet) {
        wallet = await Wallet.create({ 
          user: dr.user._id, 
          balance: 0, 
          escrowLocked: 0,
          usdtBalance: 0,
          usdtEscrowLocked: 0
        });
      }

      // Credit appropriate currency based on deposit currency
      if (dr.currency === 'NGN') {
        // Credit NGN balance
        await wallet.creditNGN(dr.amount);
        
        // Record NGN transaction
        await Transaction.create({
          user: dr.user._id,
          type: 'deposit',
          amount: dr.amount,
          currency: 'NGN',
          note: `NGN deposit approved by admin`,
          reference: dr.reference || dr.metadata?.txHash,
          metadata: {
            depositId: dr._id,
            paymentMethod: dr.paymentMethod,
            processedBy: adminId
          }
        });
      } else {
        // Credit USDT balance
        await wallet.creditUSDT(dr.amount);
        
        // Record USDT transaction
        await Transaction.create({
          user: dr.user._id,
          type: 'deposit',
          amount: dr.amount,
          currency: 'USDT',
          note: `USDT deposit approved by admin`,
          reference: dr.metadata?.txHash,
          metadata: {
            depositId: dr._id,
            paymentMethod: dr.paymentMethod,
            network: dr.metadata?.network,
            txHash: dr.metadata?.txHash,
            processedBy: adminId
          }
        });
      }

      // Create notification for approved deposit
      await createNotification(
        dr.user._id,
        'deposit_confirmed', // This matches valid enum
        'Deposit Approved',
        `Your deposit of ${amountFormatted} has been approved and credited to your ${dr.currency} wallet.`,
        {
          depositId: dr._id,
          amount: dr.amount,
          currency: dr.currency,
          status: 'approved',
          processedAt: dr.processedAt
        },
        'high'
      );

      res.json({ 
        success: true, 
        message: 'Deposit approved successfully',
        deposit: {
          id: dr._id,
          amount: dr.amount,
          currency: dr.currency,
          status: dr.status,
          processedAt: dr.processedAt
        }
      });

    } else if (action === 'reject') {
      dr.status = 'rejected';
      dr.adminNotes = reason;
      dr.processedAt = new Date();
      dr.processedBy = adminId;
      await dr.save();

      // Create notification for rejected deposit
      await createNotification(
        dr.user._id,
        'withdrawal_rejected', // Using withdrawal_rejected for deposit rejection
        'Deposit Rejected',
        `Your deposit of ${amountFormatted} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
        {
          depositId: dr._id,
          amount: dr.amount,
          currency: dr.currency,
          status: 'rejected',
          reason
        },
        'high'
      );

      res.json({ 
        success: true, 
        message: 'Deposit rejected',
        deposit: {
          id: dr._id,
          amount: dr.amount,
          currency: dr.currency,
          status: dr.status,
          processedAt: dr.processedAt,
          reason
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
    }
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

/**
 * DELETE /api/admin/deposits/:id
 * Remove deposit request and its receipt file.
 */
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const dr = await DepositRequest.findById(id);
    if (!dr) return res.status(404).json({ error: 'Deposit request not found.' });

    // Only allow deletion of rejected deposits or very old pending ones
    if (dr.status === 'approved') {
      return res.status(400).json({ error: 'Cannot delete approved deposits.' });
    }

    // Delete receipt file if exists
    if (dr.receiptUrl) {
      const receiptPath = path.join(process.cwd(), dr.receiptUrl);
      try {
        await fs.unlink(receiptPath);
        console.log('Receipt image deleted:', receiptPath);
      } catch (err) {
        console.warn('Receipt file not found or failed to delete:', receiptPath);
      }
    }

    await DepositRequest.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'Deposit request deleted successfully' 
    });
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

/**
 * GET /api/admin/deposits/stats
 * Get deposit statistics for dashboard
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await DepositRequest.aggregate([
      {
        $group: {
          _id: {
            status: '$status',
            currency: '$currency'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.status',
          currencies: {
            $push: {
              currency: '$_id.currency',
              count: '$count',
              totalAmount: '$totalAmount'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    // Format for easier consumption
    const formatted = {
      pending: { 
        NGN: { count: 0, amount: 0 }, 
        USDT: { count: 0, amount: 0 }, 
        total: 0,
        totalAmount: 0
      },
      approved: { 
        NGN: { count: 0, amount: 0 }, 
        USDT: { count: 0, amount: 0 }, 
        total: 0,
        totalAmount: 0
      },
      rejected: { 
        NGN: { count: 0, amount: 0 }, 
        USDT: { count: 0, amount: 0 }, 
        total: 0,
        totalAmount: 0
      }
    };

    stats.forEach(stat => {
      const status = stat._id;
      if (formatted[status]) {
        formatted[status].total = stat.totalCount;
        
        stat.currencies.forEach(curr => {
          if (formatted[status][curr.currency]) {
            formatted[status][curr.currency].count = curr.count;
            formatted[status][curr.currency].amount = curr.totalAmount;
          }
          formatted[status].totalAmount += curr.totalAmount;
        });
      }
    });

    // Add overall totals
    formatted.overall = {
      totalDeposits: formatted.pending.total + formatted.approved.total + formatted.rejected.total,
      totalAmount: formatted.pending.totalAmount + formatted.approved.totalAmount + formatted.rejected.totalAmount,
      pendingAmount: formatted.pending.totalAmount,
      approvedAmount: formatted.approved.totalAmount
    };

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching deposit stats:', err);
    res.status(500).json({ error: 'Failed to fetch deposit statistics.' });
  }
});

export default router;