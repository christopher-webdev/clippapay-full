import express from 'express';
import { addMonths } from 'date-fns';
import DepositRequest from '../models/DepositRequest.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'
import path from 'node:path';
import fs from 'node:fs/promises';

const router = express.Router();

/**
 * GET /api/admin/deposits/pending
 * List all pending deposit requests.
 */
router.get(
  '/pending',
  requireAdminAuth,
  async (req, res) => {
    try {
      const list = await DepositRequest
        .find({ status: 'pending' })
        .populate('user', 'email');
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load pending deposits.' });
    }
  }
);
router.get(
  '/',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { status, search } = req.query;
      
      // Build query conditions
      const conditions = {};
      
      // Status filter
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        conditions.status = status;
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
        conditions.user = { $in: users.map(u => u._id) };
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
          email: d.user?.email || '',
          name: d.user?.firstName 
            ? `${d.user.firstName}${d.user.lastName ? ' ' + d.user.lastName : ''}`
            : d.user?.company || 'Unknown',
          role: d.user?.role || ''
        },
        amount: d.amount,
        receiptUrl: d.receiptUrl,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
      
      res.json(formatted);
    } catch (err) {
      console.error('Error fetching deposits:', err);
      res.status(500).json({ error: 'Failed to load deposits.' });
    }
  }
);

/**
 * POST /api/admin/deposits/:id/verify
 * Body: { action: 'approve'|'reject' }
 */
router.post(
  '/:id/verify',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const dr = await DepositRequest.findById(id);
      if (!dr) return res.status(404).json({ error: 'Not found.' });
      if (dr.status !== 'pending') {
        return res.status(400).json({ error: 'Already processed.' });
      }

      if (action === 'approve') {
        dr.status = 'approved';
        await dr.save();

        // credit wallet
        let w = await Wallet.findOne({ user: dr.user });
        if (!w) {
          w = await Wallet.create({ user: dr.user, balance: 0, escrowLocked: 0 });
        }
        await w.credit(dr.amount);

        // record transaction
        await Transaction.create({
          user: dr.user,
          type: 'deposit',
          amount: dr.amount,
          note: 'Deposit approved'
        });

      } else {  // reject
        dr.status = 'rejected';
        await dr.save();
      }

      res.json(dr);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Verification failed.' });
    }
  }
);

/**
 * DELETE /api/admin/deposits/:id
 * Remove deposit request and its receipt file.
 */


router.delete(
  '/:id',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const dr = await DepositRequest.findById(id);
      if (!dr) return res.status(404).json({ error: 'Not found.' });

      // Make sure receiptUrl is a local file path
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
      res.json({ success: true });
    } catch (err) {
      console.error('Delete failed:', err);
      res.status(500).json({ error: 'Delete failed.' });
    }
  }
);


export default router;
