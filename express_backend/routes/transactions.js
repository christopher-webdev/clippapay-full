// File: express_backend/routes/transactions.js

import express from 'express';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/transactions
 * View own transactions (clippers & advertisers)
 */
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const list = await Transaction.find({ user_id: req.user._id });
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching transactions.' });
    }
  }
);

export default router;
