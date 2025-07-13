import express from 'express';
import Withdrawal from '../models/Withdrawal.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js'; // Make sure User schema has email and name fields
import { requireAdminAuth } from '../middleware/adminAuth.js'

const router = express.Router();

// GET /api/admin/withdrawals
// Returns all withdrawals, mapped for frontend display,requireAdminAuth
router.get('/', async (req, res, next) => {
  try {
    // Fetch withdrawals and populate user info with all necessary fields
    const withdrawals = await Withdrawal.find()
      .sort({ requestedAt: -1 })
      .populate({
        path: 'user',
        select: 'email firstName contactName company role' // Include all needed fields
      });

    const mapped = withdrawals.map(w => ({
      id: w._id,
      userEmail: w.user?.email || '',
      userName: w.user?.firstName || w.user?.contactName || w.user?.company || '',
      role: w.user?.role || '',
      amount: w.amount,
      bankName: w.bank_name,
      accountNumber: w.account_number,
      accountName: w.account_name,
      usdtAddress: w.usdt_address,
      usdtNetwork: w.usdt_network,
      createdAt: w.requestedAt,
      processedAt: w.processedAt,
      status: w.status,
      declineReason: w.declineReason
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});
// DELETE /api/admin/withdrawals/:id
// Permanently remove a withdrawal record
router.delete('/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Only allow deletes for non-pending records, if you’d like
    if (withdrawal.status === 'pending') {
      return res.status(400).json({ error: 'Cannot delete a pending withdrawal' });
    }

    await Withdrawal.deleteOne({ _id: id });
    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});


// Approve a pending withdrawal and debit the user's wallet
router.post('/:id/approve',requireAdminAuth, async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const wallet = await Wallet.findOne({ user: withdrawal.user });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Debit user balance
    try {
      await wallet.debit(withdrawal.amount);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const updated = await withdrawal.markPaid();
    res.json({ id: updated._id, status: updated.status, processedAt: updated.processedAt });
  } catch (err) {
    next(err);
  }
});

// Decline a pending withdrawal
router.post('/:id/decline', requireAdminAuth, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const updated = await withdrawal.markDeclined(reason);
    res.json({ id: updated._id, status: updated.status, processedAt: updated.processedAt, declineReason: updated.declineReason });
  } catch (err) {
    next(err);
  }
});

export default router;
