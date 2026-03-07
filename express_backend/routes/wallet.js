// File: express_backend/routes/wallet.js

import express from 'express';
import path from 'path';
import multer from 'multer';
import Wallet from '../models/Wallet.js';
import DepositRequest from '../models/DepositRequest.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import { requireAuth } from '../middleware/auth.js';
import PlatformSetting from '../models/PlatformSetting.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import axios from 'axios';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Multer for deposit receipts
const depositStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'deposits'),
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const depositUpload = multer({ storage: depositStorage });

// Helper function to create notifications
async function createNotification(userId, type, title, message, data = {}, priority = 'medium') {
  try {
    const notification = new Notification({
      user: userId,
      type,
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
  }
}

/**
 * GET /api/wallet
 * Get user wallet with both NGN and USDT balances
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Try to find existing wallet
    let wallet = await Wallet.findOne({ user: req.user._id });
    // If none, create an empty one
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        balance: 0,
        escrowLocked: 0,
        usdtBalance: 0,
        usdtEscrowLocked: 0
      });
    }
    
    res.json({
      balance: wallet.balance,
      escrowLocked: wallet.escrowLocked,
      usdtBalance: wallet.usdtBalance,
      usdtEscrowLocked: wallet.usdtEscrowLocked
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching wallet.' });
  }
});

/**
 * POST /api/wallet/deposits
 * User requests to fund their wallet (NGN bank transfer)
 */
// POST /api/wallet/deposits
// File: express_backend/routes/wallet.js (partial - just the deposit creation part)

// POST /api/wallet/deposits
router.post(
  '/deposits',
  requireAuth,
  depositUpload.single('receipt'),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { amount, currency, paymentMethod, txHash, network } = req.body;
      
      // Validate required fields
      if (!req.file) {
        return res.status(400).json({ error: 'Receipt is required.' });
      }
      
      if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      // Validate currency
      if (!['NGN', 'USDT'].includes(currency)) {
        return res.status(400).json({ error: 'Invalid currency.' });
      }

      // Validate USDT-specific fields
      if (currency === 'USDT') {
        if (!txHash) {
          return res.status(400).json({ error: 'Transaction hash is required for USDT deposits.' });
        }
        
        // Check if transaction hash already exists
        const existingDeposit = await DepositRequest.findOne({ 
          'metadata.txHash': txHash,
          currency: 'USDT'
        });
        
        if (existingDeposit) {
          return res.status(400).json({ error: 'This transaction hash has already been used.' });
        }
      }

    

      const receiptUrl = `/uploads/deposits/${req.file.filename}`;
      
      // Prepare metadata based on currency
      const metadata = {
        ...(currency === 'USDT' && { 
          txHash: txHash.trim(),
          network: network || 'TRC20'
        }),
        ...(currency === 'NGN' && { 
          bankName: platform?.bank.name,
          accountNumber: platform?.bank.accountNumber
        })
      };

      // Create deposit request
      const deposit = await DepositRequest.create({
        user: userId,
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        receiptUrl,
        metadata,
        status: 'pending'
      });

      // Create notification for deposit submission - using valid enum
      const notificationTitle = currency === 'NGN' 
        ? 'Deposit Request Submitted' 
        : 'USDT Deposit Request Submitted';
      
      const notificationBody = currency === 'NGN'
        ? `Your deposit request of ₦${parseFloat(amount).toLocaleString()} has been submitted and is pending approval.`
        : `Your USDT deposit request of ${amount} USDT has been submitted and is pending confirmation.`;

      // Use 'system_alert' as fallback type if specific type not in enum
      await createNotification(
        userId,
        'system_alert', // Using system_alert instead of deposit_submitted
        notificationTitle,
        notificationBody,
        {
          depositId: deposit._id,
          amount: parseFloat(amount),
          currency,
          status: 'pending',
          ...(currency === 'USDT' && { txHash: txHash.trim() })
        },
        'medium'
      );

      res.status(201).json({
        message: 'Deposit request submitted successfully',
        deposit: {
          id: deposit._id,
          amount: deposit.amount,
          currency: deposit.currency,
          status: deposit.status,
          createdAt: deposit.createdAt
        }
      });

    } catch (err) {
      console.error('Deposit creation error:', err);
      
      // Handle specific errors
      if (err.code === 11000) { // Duplicate key error
        return res.status(400).json({ error: 'This transaction hash has already been used.' });
      }
      
      res.status(500).json({ error: 'Error creating deposit request.' });
    }
  }
);


/**
 * GET /api/wallet/deposits
 * List current user's deposit requests (both NGN and USDT)
 */
router.get('/deposits', requireAuth, async (req, res) => {
  try {
    const list = await DepositRequest
      .find({ user: req.user._id })
      .sort('-createdAt');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching deposit requests.' });
  }
});

/**
 * POST /api/wallet/withdrawals
 * Create withdrawal request (NGN or USDT)
 */
router.post('/withdrawals', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      amount, 
      currency, 
      paymentMethod,
      bank_name,
      account_number,
      account_name,
      usdt_address,
      usdt_network 
    } = req.body;
    
    // Validate required fields
    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    // Get wallet to check balance
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not found.' });
    }
    
    // Check balance based on currency
    if (currency === 'NGN') {
      if (wallet.balance < amount) {
        return res.status(400).json({ error: 'Insufficient NGN balance.' });
      }
      
      // Validate bank details
      if (!bank_name || !account_number || !account_name) {
        return res.status(400).json({ error: 'Bank details are required for NGN withdrawals.' });
      }
    } else if (currency === 'USDT') {
      if (wallet.usdtBalance < amount) {
        return res.status(400).json({ error: 'Insufficient USDT balance.' });
      }
      
      // Validate USDT details
      if (!usdt_address || !usdt_network) {
        return res.status(400).json({ error: 'USDT address and network are required.' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid currency.' });
    }
    
    // Create withdrawal request
    const withdrawal = await WithdrawalRequest.create({
      user: userId,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      bank_name,
      account_number,
      account_name,
      usdt_address,
      usdt_network,
      status: 'pending'
    });
    
    // Lock the funds in escrow
    if (currency === 'NGN') {
      await wallet.lockEscrowNGN(parseFloat(amount));
    } else {
      await wallet.lockEscrowUSDT(parseFloat(amount));
    }

    // Create notification for withdrawal request
    const currencySymbol = currency === 'NGN' ? '₦' : '';
    const amountFormatted = currency === 'NGN' 
      ? `₦${parseFloat(amount).toLocaleString()}`
      : `${parseFloat(amount)} USDT`;
    
    await createNotification(
      userId,
      'withdrawal_processed',
      'Withdrawal Request Submitted',
      `Your withdrawal request of ${amountFormatted} has been submitted and is pending processing.`,
      {
        withdrawalId: withdrawal._id,
        amount: parseFloat(amount),
        currency,
        status: 'pending'
      },
      'medium'
    );
    
    res.status(201).json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating withdrawal request.' });
  }
});

/**
 * GET /api/wallet/withdrawals
 * List user's withdrawal requests
 */
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    const list = await WithdrawalRequest
      .find({ user: req.user._id })
      .sort('-createdAt');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching withdrawal requests.' });
  }
});

/**
 * GET /api/wallet/platform-details
 * Get platform payment details (bank and USDT)
 */
router.get('/platform-details', requireAuth, async (req, res) => {
  try {
    const settings = await PlatformSetting.find({
      key: { 
        $in: [
          'bankName', 
          'bankAccountNumber', 
          'bankAccountName',
          'usdtAddress',
          'usdtNetwork',
          'usdtMinDeposit',
          'usdtMinWithdrawal',
          'ngnMinDeposit',
          'ngnMinWithdrawal',
          'usdtRate'
        ] 
      }
    }).lean();

    const result = {
      bank: {
        name: settings.find(s => s.key === 'bankName')?.value || '',
        accountNumber: settings.find(s => s.key === 'bankAccountNumber')?.value || '',
        accountName: settings.find(s => s.key === 'bankAccountName')?.value || ''
      },
      usdt: {
        address: settings.find(s => s.key === 'usdtAddress')?.value || '',
        network: settings.find(s => s.key === 'usdtNetwork')?.value || 'TRC20',
        minDeposit: parseFloat(settings.find(s => s.key === 'usdtMinDeposit')?.value || '10'),
        minWithdrawal: parseFloat(settings.find(s => s.key === 'usdtMinWithdrawal')?.value || '5')
      },
      limits: {
        ngnMinDeposit: parseFloat(settings.find(s => s.key === 'ngnMinDeposit')?.value || '20000'),
        ngnMinWithdrawal: parseFloat(settings.find(s => s.key === 'ngnMinWithdrawal')?.value || '1000'),
        usdtRate: parseFloat(settings.find(s => s.key === 'usdtRate')?.value || '1500')
      }
    };

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch platform details' });
  }
});

/**
 * POST /api/wallet/verify-paystack
 * Verify Paystack payment and credit wallet
 */
router.post('/verify-paystack', requireAuth, async (req, res) => {
  const { reference } = req.body;
  const secretKey = process.env.PAYSTACK_SECRET;

  try {
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data = verifyRes.data.data;
    if (data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful.' });
    }

    const amount = data.amount / 100; // Convert kobo to Naira

    // Check if already processed
    const existingDeposit = await DepositRequest.findOne({ reference });
    if (existingDeposit) {
      return res.status(400).json({ error: 'Payment already processed.' });
    }

    // Create approved deposit
    const deposit = new DepositRequest({
      user: req.user._id,
      amount,
      currency: 'NGN',
      paymentMethod: 'paystack',
      status: 'approved',
      reference
    });
    await deposit.save();

    // Credit wallet
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = new Wallet({ 
        user: req.user._id, 
        balance: 0, 
        escrowLocked: 0,
        usdtBalance: 0,
        usdtEscrowLocked: 0
      });
    }
    await wallet.creditNGN(amount);

    // Record transaction
    await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      currency: 'NGN',
      note: 'Paystack deposit approved',
      reference
    });

    // Create notification for successful Paystack deposit
    await createNotification(
      req.user._id,
      'wallet_credited',
      'Deposit Successful',
      `Your wallet has been credited with ₦${amount.toLocaleString()} via Paystack.`,
      {
        depositId: deposit._id,
        amount,
        currency: 'NGN',
        paymentMethod: 'paystack',
        reference
      },
      'high'
    );

    res.json({ message: 'Deposit successful.' });
  } catch (err) {
    console.error('Paystack verification error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

/**
 * ADMIN ROUTES
 */

/**
 * GET /api/wallet/admin/deposits/pending
 * Get all pending deposits (admin only)
 */
router.get('/admin/deposits/pending', requireAdminAuth, async (req, res) => {
  try {
    const pending = await DepositRequest
      .find({ status: 'pending' })
      .populate('user', 'email firstName lastName')
      .sort('-createdAt');
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching pending deposits.' });
  }
});

/**
 * POST /api/wallet/admin/deposits/:id/approve
 * Approve a deposit (admin only)
 */
router.post('/admin/deposits/:id/approve', requireAdminAuth, async (req, res) => {
  try {
    const deposit = await DepositRequest.findById(req.params.id).populate('user');
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found.' });
    }
    
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit already processed.' });
    }
    
    // Update deposit status
    deposit.status = 'approved';
    deposit.processedAt = new Date();
    deposit.processedBy = req.user._id;
    await deposit.save();
    
    // Credit wallet based on currency
    const wallet = await Wallet.findOne({ user: deposit.user._id });
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found.' });
    }
    
    let amountFormatted;
    if (deposit.currency === 'NGN') {
      await wallet.creditNGN(deposit.amount);
      amountFormatted = `₦${deposit.amount.toLocaleString()}`;
    } else {
      await wallet.creditUSDT(deposit.amount);
      amountFormatted = `${deposit.amount} USDT`;
    }
    
    // Record transaction
    await Transaction.create({
      user: deposit.user._id,
      type: 'deposit',
      amount: deposit.amount,
      currency: deposit.currency,
      note: `Deposit approved by admin`,
      reference: deposit.reference || deposit.txHash
    });


    // Create notification for approved deposit
    await createNotification(
      deposit.user._id,
      'deposit_confirmed',
      'Deposit Approved',
      `Your deposit of ${amountFormatted} has been approved and credited to your wallet.`,
      {
        depositId: deposit._id,
        amount: deposit.amount,
        currency: deposit.currency,
        status: 'approved',
        processedAt: deposit.processedAt
      },
      'high'
    );
    
    res.json({ message: 'Deposit approved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error approving deposit.' });
  }
});

/**
 * POST /api/wallet/admin/deposits/:id/reject
 * Reject a deposit (admin only)
 */
router.post('/admin/deposits/:id/reject', requireAdminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const deposit = await DepositRequest.findById(req.params.id).populate('user');
    
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found.' });
    }
    
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit already processed.' });
    }
    
    deposit.status = 'rejected';
    deposit.adminNotes = reason;
    deposit.processedAt = new Date();
    deposit.processedBy = req.user._id;
    await deposit.save();

    // Create notification for rejected deposit
    const amountFormatted = deposit.currency === 'NGN' 
      ? `₦${deposit.amount.toLocaleString()}`
      : `${deposit.amount} USDT`;
    
    await createNotification(
      deposit.user._id,
      'withdrawal_rejected',
      'Deposit Rejected',
      `Your deposit of ${amountFormatted} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
      {
        depositId: deposit._id,
        amount: deposit.amount,
        currency: deposit.currency,
        status: 'rejected',
        reason
      },
      'high'
    );
    
    res.json({ message: 'Deposit rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error rejecting deposit.' });
  }
});

/**
 * GET /api/wallet/admin/withdrawals/pending
 * Get all pending withdrawals (admin only)
 */
router.get('/admin/withdrawals/pending', requireAdminAuth, async (req, res) => {
  try {
    const pending = await WithdrawalRequest
      .find({ status: 'pending' })
      .populate('user', 'email firstName lastName')
      .sort('-createdAt');
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching pending withdrawals.' });
  }
});

/**
 * POST /api/wallet/admin/withdrawals/:id/process
 * Process a withdrawal (admin only)
 */
router.post('/admin/withdrawals/:id/process', requireAdminAuth, async (req, res) => {
  try {
    const { status, reason, txHash } = req.body;
    const withdrawal = await WithdrawalRequest.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found.' });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed.' });
    }
    
    const wallet = await Wallet.findOne({ user: withdrawal.user._id });
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found.' });
    }
    
    const amountFormatted = withdrawal.currency === 'NGN' 
      ? `₦${withdrawal.amount.toLocaleString()}`
      : `${withdrawal.amount} USDT`;
    
    if (status === 'completed') {
      // Funds are already in escrow, now deduct them permanently
      if (withdrawal.currency === 'NGN') {
        wallet.escrowLocked -= withdrawal.amount;
      } else {
        wallet.usdtEscrowLocked -= withdrawal.amount;
      }
      await wallet.save();
      
      withdrawal.status = 'completed';
      withdrawal.txHash = txHash;

      // Create notification for completed withdrawal
      await createNotification(
        withdrawal.user._id,
        'withdrawal_processed',
        'Withdrawal Completed',
        `Your withdrawal of ${amountFormatted} has been processed successfully.`,
        {
          withdrawalId: withdrawal._id,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          status: 'completed',
          txHash
        },
        'high'
      );
      
    } else if (status === 'declined') {
      // Release funds back from escrow
      if (withdrawal.currency === 'NGN') {
        await wallet.releaseEscrowNGN(withdrawal.amount);
      } else {
        await wallet.releaseEscrowUSDT(withdrawal.amount);
      }
      
      withdrawal.status = 'declined';
      withdrawal.declineReason = reason;

      // Create notification for declined withdrawal
      await createNotification(
        withdrawal.user._id,
        'withdrawal_rejected',
        'Withdrawal Declined',
        `Your withdrawal request of ${amountFormatted} has been declined. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
        {
          withdrawalId: withdrawal._id,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          status: 'declined',
          reason
        },
        'high'
      );
    }
    
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    await withdrawal.save();
    
    res.json({ message: `Withdrawal ${status} successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing withdrawal.' });
  }
});

/**
 * POST /api/wallet/admin/balance/low-alert
 * Send low balance alert to user (admin only)
 */
router.post('/admin/balance/low-alert/:userId', requireAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { threshold, message } = req.body;
    
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    await createNotification(
      userId,
      'low_balance',
      'Low Balance Alert',
      message || `Your wallet balance (₦${wallet.balance.toLocaleString()}) is below the recommended threshold. Please consider funding your account.`,
      {
        balance: wallet.balance,
        threshold: threshold || 5000
      },
      'high'
    );

    res.json({ message: 'Low balance alert sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error sending low balance alert.' });
  }
});

export default router;