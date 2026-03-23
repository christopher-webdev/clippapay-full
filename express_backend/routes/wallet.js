// File: express_backend/routes/wallet.js
// FIXED:
//  1. Removed undefined `platform` variable reference in POST /deposits (was crashing line 137)
//  2. Fetches bank details from PlatformSetting directly when building NGN metadata
//  3. Fixed invalid notification type 'withdrawal_processed' → 'system_alert'
//  4. Fixed invalid notification type 'wallet_credited' → 'deposit_confirmed'
//  5. Fixed invalid notification type 'low_balance' → 'system_alert'

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

// ── Multer for deposit receipts ───────────────────────────────────────────────
const depositStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'deposits'),
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const depositUpload = multer({ storage: depositStorage });

// ── Valid notification enum values ────────────────────────────────────────────
const VALID_NOTIF_TYPES = [
  'deposit_confirmed', 'withdrawal_rejected', 'withdrawal_approved',
  'campaign_created', 'campaign_approved', 'campaign_rejected',
  'payment_received', 'payment_sent', 'system_alert', 'reminder',
  'welcome', 'password_reset', 'email_verified', 'two_factor_enabled',
  'two_factor_disabled', 'profile_updated', 'security_alert', 'login_alert',
];

async function createNotification(userId, type, title, message, data = {}, priority = 'medium') {
  try {
    const safeType = VALID_NOTIF_TYPES.includes(type) ? type : 'system_alert';
    await new Notification({
      user: userId,
      type: safeType,
      title,
      message,
      priority,
      data,
      inAppDelivered: true,
    }).save();
  } catch (err) {
    console.error('Notification error (non-fatal):', err.message);
  }
}

// ── Helper: load platform bank + USDT settings ────────────────────────────────
async function getPlatformSettings() {
  const rows = await PlatformSetting.find({
    key: {
      $in: [
        'bankName', 'bankAccountNumber', 'bankAccountName',
        'usdtAddress', 'usdtNetwork',
        'usdtMinDeposit', 'usdtMinWithdrawal',
        'ngnMinDeposit', 'ngnMinWithdrawal', 'usdtRate',
      ],
    },
  }).lean();

  const get = (key, fallback = '') => rows.find((r) => r.key === key)?.value ?? fallback;

  return {
    bank: {
      name:          get('bankName'),
      accountNumber: get('bankAccountNumber'),
      accountName:   get('bankAccountName'),
    },
    usdt: {
      address:       get('usdtAddress'),
      network:       get('usdtNetwork', 'TRC20'),
      minDeposit:    parseFloat(get('usdtMinDeposit',    '50')),
      minWithdrawal: parseFloat(get('usdtMinWithdrawal', '5')),
    },
    limits: {
      ngnMinDeposit:    parseFloat(get('ngnMinDeposit',    '20000')),
      ngnMinWithdrawal: parseFloat(get('ngnMinWithdrawal', '5000')),
      usdtRate:         parseFloat(get('usdtRate',         '1500')),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/wallet
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        balance: 0, escrowLocked: 0,
        usdtBalance: 0, usdtEscrowLocked: 0,
      });
    }
    res.json({
      balance:          wallet.balance,
      escrowLocked:     wallet.escrowLocked,
      usdtBalance:      wallet.usdtBalance,
      usdtEscrowLocked: wallet.usdtEscrowLocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching wallet.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/wallet/deposits
//  User submits a deposit request with receipt upload
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/deposits',
  requireAuth,
  depositUpload.single('receipt'),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { amount, currency, paymentMethod, txHash, network } = req.body;

      // ── Basic validation ────────────────────────────────────────────────
      if (!req.file) {
        return res.status(400).json({ error: 'Receipt is required.' });
      }
      if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({ error: 'amount, currency and paymentMethod are required.' });
      }
      if (!['NGN', 'USDT'].includes(currency)) {
        return res.status(400).json({ error: 'currency must be NGN or USDT.' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount.' });
      }

      // ── Minimum deposit enforcement ─────────────────────────────────────
      const MIN_NGN  = 20_000;
      const MIN_USDT = 50;
      if (currency === 'NGN' && parsedAmount < MIN_NGN) {
        return res.status(400).json({ error: `Minimum NGN deposit is ₦${MIN_NGN.toLocaleString()}.` });
      }
      if (currency === 'USDT' && parsedAmount < MIN_USDT) {
        return res.status(400).json({ error: `Minimum USDT deposit is $${MIN_USDT} USDT.` });
      }

      // ── USDT-specific validation ────────────────────────────────────────
      if (currency === 'USDT') {
        if (!txHash || !txHash.trim()) {
          return res.status(400).json({ error: 'Transaction hash (TXID) is required for USDT deposits.' });
        }
        const existing = await DepositRequest.findOne({
          'metadata.txHash': txHash.trim(),
          currency: 'USDT',
        });
        if (existing) {
          return res.status(400).json({ error: 'This transaction hash has already been used.' });
        }
      }

      // ── Build metadata (NO undefined variables) ─────────────────────────
      // For NGN: optionally store which bank account the user was told to pay
      let bankName = '';
      let bankAccountNumber = '';
      if (currency === 'NGN') {
        try {
          const rows = await PlatformSetting.find({
            key: { $in: ['bankName', 'bankAccountNumber'] },
          }).lean();
          bankName          = rows.find((r) => r.key === 'bankName')?.value          || '';
          bankAccountNumber = rows.find((r) => r.key === 'bankAccountNumber')?.value || '';
        } catch (_) {
          // non-fatal — metadata is informational only
        }
      }

      const metadata =
        currency === 'USDT'
          ? { txHash: txHash.trim(), network: (network || 'TRC20') }
          : { bankName, accountNumber: bankAccountNumber };

      // ── Create deposit record ───────────────────────────────────────────
      const receiptUrl = `/uploads/deposits/${req.file.filename}`;

      const deposit = await DepositRequest.create({
        user:          userId,
        amount:        parsedAmount,
        currency,
        paymentMethod,
        receiptUrl,
        metadata,
        status:        'pending',
      });

      // ── Notify user ─────────────────────────────────────────────────────
      const amtFmt = currency === 'NGN'
        ? `₦${parsedAmount.toLocaleString()}`
        : `${parsedAmount} USDT`;

      await createNotification(
        userId,
        'system_alert',
        'Deposit Request Submitted',
        `Your deposit of ${amtFmt} has been submitted and is pending admin approval.`,
        { depositId: deposit._id, amount: parsedAmount, currency, status: 'pending' },
        'medium',
      );

      res.status(201).json({
        message: 'Deposit request submitted successfully',
        deposit: {
          id:        deposit._id,
          amount:    deposit.amount,
          currency:  deposit.currency,
          status:    deposit.status,
          createdAt: deposit.createdAt,
        },
      });
    } catch (err) {
      console.error('Deposit creation error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ error: 'This transaction hash has already been used.' });
      }
      res.status(500).json({ error: 'Error creating deposit request.' });
    }
  },
);

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/wallet/deposits
// ══════════════════════════════════════════════════════════════════════════════
router.get('/deposits', requireAuth, async (req, res) => {
  try {
    const list = await DepositRequest.find({ user: req.user._id }).sort('-createdAt');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching deposit requests.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/wallet/withdrawals  (kept for backward compat — main route is /api/withdrawals)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/withdrawals', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      amount, currency, paymentMethod,
      bank_name, account_number, account_name,
      usdt_address, usdt_network,
    } = req.body;

    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({ error: 'amount, currency and paymentMethod are required.' });
    }
    if (!['NGN', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'currency must be NGN or USDT.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    // Minimum withdrawal
    const MIN_W_NGN  = 5_000;
    const MIN_W_USDT = 5;
    if (currency === 'NGN'  && parsedAmount < MIN_W_NGN)  return res.status(400).json({ error: `Minimum NGN withdrawal is ₦${MIN_W_NGN.toLocaleString()}.` });
    if (currency === 'USDT' && parsedAmount < MIN_W_USDT) return res.status(400).json({ error: `Minimum USDT withdrawal is $${MIN_W_USDT} USDT.` });

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });

    if (currency === 'NGN') {
      if (wallet.balance < parsedAmount) return res.status(400).json({ error: 'Insufficient NGN balance.' });
      if (!bank_name || !account_number || !account_name) return res.status(400).json({ error: 'Bank details are required for NGN withdrawals.' });
    } else {
      if (wallet.usdtBalance < parsedAmount) return res.status(400).json({ error: 'Insufficient USDT balance.' });
      if (!usdt_address || !usdt_network)    return res.status(400).json({ error: 'USDT address and network are required.' });
    }

    const withdrawal = await WithdrawalRequest.create({
      user: userId, amount: parsedAmount, currency, paymentMethod,
      bank_name, account_number, account_name,
      usdt_address, usdt_network,
      status: 'pending',
    });

    // Lock funds into escrow while pending
    if (currency === 'NGN') {
      await wallet.lockEscrowNGN(parsedAmount);
    } else {
      await wallet.lockEscrowUSDT(parsedAmount);
    }

    const amtFmt = currency === 'NGN' ? `₦${parsedAmount.toLocaleString()}` : `${parsedAmount} USDT`;
    await createNotification(
      userId, 'system_alert',
      'Withdrawal Request Submitted',
      `Your withdrawal of ${amtFmt} has been submitted and is pending processing.`,
      { withdrawalId: withdrawal._id, amount: parsedAmount, currency, status: 'pending' },
      'medium',
    );

    res.status(201).json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating withdrawal request.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/wallet/withdrawals
// ══════════════════════════════════════════════════════════════════════════════
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    const list = await WithdrawalRequest.find({ user: req.user._id }).sort('-createdAt');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching withdrawal requests.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/wallet/platform-details
// ══════════════════════════════════════════════════════════════════════════════
router.get('/platform-details', requireAuth, async (req, res) => {
  try {
    const details = await getPlatformSettings();
    res.json(details);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch platform details.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/wallet/verify-paystack
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify-paystack', requireAuth, async (req, res) => {
  const { reference } = req.body;
  const secretKey = process.env.PAYSTACK_SECRET;

  try {
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    const data = verifyRes.data.data;
    if (data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful.' });
    }

    const amount = data.amount / 100;

    const existingDeposit = await DepositRequest.findOne({ reference });
    if (existingDeposit) {
      return res.status(400).json({ error: 'Payment already processed.' });
    }

    const deposit = await DepositRequest.create({
      user: req.user._id, amount, currency: 'NGN',
      paymentMethod: 'paystack', status: 'approved', reference,
    });

    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id, balance: 0, escrowLocked: 0,
        usdtBalance: 0, usdtEscrowLocked: 0,
      });
    }
    await wallet.creditNGN(amount);

    await Transaction.create({
      user: req.user._id, type: 'deposit', amount, currency: 'NGN',
      note: 'Paystack deposit approved', reference,
    });

    await createNotification(
      req.user._id, 'deposit_confirmed',
      'Deposit Successful',
      `Your wallet has been credited with ₦${amount.toLocaleString()} via Paystack.`,
      { depositId: deposit._id, amount, currency: 'NGN', paymentMethod: 'paystack', reference },
      'high',
    );

    res.json({ message: 'Deposit successful.' });
  } catch (err) {
    console.error('Paystack verification error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

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

router.post('/admin/deposits/:id/approve', requireAdminAuth, async (req, res) => {
  try {
    const deposit = await DepositRequest.findById(req.params.id).populate('user');
    if (!deposit)                   return res.status(404).json({ error: 'Deposit not found.' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed.' });

    deposit.status      = 'approved';
    deposit.processedAt = new Date();
    deposit.processedBy = req.user._id;
    await deposit.save();

    const wallet = await Wallet.findOne({ user: deposit.user._id });
    if (!wallet) return res.status(404).json({ error: 'User wallet not found.' });

    let amtFmt;
    if (deposit.currency === 'NGN') {
      await wallet.creditNGN(deposit.amount);
      amtFmt = `₦${deposit.amount.toLocaleString()}`;
    } else {
      await wallet.creditUSDT(deposit.amount);
      amtFmt = `${deposit.amount} USDT`;
    }

    await Transaction.create({
      user: deposit.user._id, type: 'deposit',
      amount: deposit.amount, currency: deposit.currency,
      note: 'Deposit approved by admin',
      reference: deposit.reference || deposit.metadata?.txHash,
    });

    await createNotification(
      deposit.user._id, 'deposit_confirmed',
      'Deposit Approved',
      `Your deposit of ${amtFmt} has been approved and credited to your wallet.`,
      { depositId: deposit._id, amount: deposit.amount, currency: deposit.currency, status: 'approved' },
      'high',
    );

    res.json({ message: 'Deposit approved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error approving deposit.' });
  }
});

router.post('/admin/deposits/:id/reject', requireAdminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const deposit = await DepositRequest.findById(req.params.id).populate('user');
    if (!deposit)                   return res.status(404).json({ error: 'Deposit not found.' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed.' });

    deposit.status      = 'rejected';
    deposit.adminNotes  = reason;
    deposit.processedAt = new Date();
    deposit.processedBy = req.user._id;
    await deposit.save();

    const amtFmt = deposit.currency === 'NGN'
      ? `₦${deposit.amount.toLocaleString()}`
      : `${deposit.amount} USDT`;

    await createNotification(
      deposit.user._id, 'withdrawal_rejected',
      'Deposit Rejected',
      `Your deposit of ${amtFmt} was rejected.${reason ? ` Reason: ${reason}` : ' Contact support for more info.'}`,
      { depositId: deposit._id, amount: deposit.amount, currency: deposit.currency, status: 'rejected', reason },
      'high',
    );

    res.json({ message: 'Deposit rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error rejecting deposit.' });
  }
});

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

router.post('/admin/withdrawals/:id/process', requireAdminAuth, async (req, res) => {
  try {
    const { status, reason, txHash } = req.body;
    const withdrawal = await WithdrawalRequest.findById(req.params.id).populate('user');
    if (!withdrawal)                     return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed.' });

    const wallet = await Wallet.findOne({ user: withdrawal.user._id });
    if (!wallet) return res.status(404).json({ error: 'User wallet not found.' });

    const amtFmt = withdrawal.currency === 'NGN'
      ? `₦${withdrawal.amount.toLocaleString()}`
      : `${withdrawal.amount} USDT`;

    if (status === 'completed') {
      // Permanently deduct from escrow (funds were moved there on request creation)
      if (withdrawal.currency === 'NGN') {
        wallet.escrowLocked -= withdrawal.amount;
      } else {
        wallet.usdtEscrowLocked -= withdrawal.amount;
      }
      await wallet.save();

      withdrawal.status = 'completed';
      if (txHash) withdrawal.txHash = txHash;

      await createNotification(
        withdrawal.user._id, 'withdrawal_approved',
        'Withdrawal Completed',
        `Your withdrawal of ${amtFmt} has been processed and sent.`,
        { withdrawalId: withdrawal._id, amount: withdrawal.amount, currency: withdrawal.currency, status: 'completed', txHash },
        'high',
      );

    } else if (status === 'declined') {
      // Release funds back to available balance
      if (withdrawal.currency === 'NGN') {
        await wallet.releaseEscrowNGN(withdrawal.amount);
      } else {
        await wallet.releaseEscrowUSDT(withdrawal.amount);
      }

      withdrawal.status        = 'declined';
      withdrawal.declineReason = reason;

      await createNotification(
        withdrawal.user._id, 'withdrawal_rejected',
        'Withdrawal Declined',
        `Your withdrawal of ${amtFmt} was declined.${reason ? ` Reason: ${reason}` : ' Contact support for more info.'} Funds have been returned to your wallet.`,
        { withdrawalId: withdrawal._id, amount: withdrawal.amount, currency: withdrawal.currency, status: 'declined', reason },
        'high',
      );

    } else {
      return res.status(400).json({ error: 'status must be completed or declined.' });
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

router.post('/admin/balance/low-alert/:userId', requireAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { threshold, message } = req.body;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });

    await createNotification(
      userId, 'system_alert',
      'Low Balance Alert',
      message || `Your wallet balance (₦${wallet.balance.toLocaleString()}) is below the recommended threshold. Please consider funding your account.`,
      { balance: wallet.balance, threshold: threshold || 5000 },
      'high',
    );

    res.json({ message: 'Low balance alert sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error sending low balance alert.' });
  }
});

export default router;