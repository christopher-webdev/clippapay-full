// File: express_backend/routes/subscription.js

import express from 'express';
import multer from 'multer';
import path from 'path';
import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js';

const router = express.Router();

// Multer config: store receipts in ./uploads/receipts
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'receipts'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// POST /api/subscriptions
// Create a pending subscription with payment details + receipt
router.post(
  '/',
  requireAuth,
  requireAdvertiser,
  upload.single('receipt'),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const {
        planId,
        paymentMethod,
        bankName,
        accountNumber,
        accountName,
        usdtNetwork
      } = req.body;

      // Validate plan
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) return res.status(404).json({ error: 'Plan not found.' });

      // Receipt required
      if (!req.file) return res.status(400).json({ error: 'Receipt upload required.' });
      const receiptUrl = `/uploads/receipts/${req.file.filename}`;

      // Create subscription (pending)
      const sub = await Subscription.create({
        user: userId,
        plan: planId,
        paymentMethod,
        bankName:      paymentMethod === 'bank' ? bankName      : undefined,
        accountNumber: paymentMethod === 'bank' ? accountNumber : undefined,
        accountName:   paymentMethod === 'bank' ? accountName   : undefined,
        usdtNetwork:   paymentMethod === 'usdt' ? usdtNetwork   : undefined,
        receiptUrl,
        status: 'pending',
        paymentStatus: 'pending'
      });

      res.status(201).json(sub);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error creating subscription.' });
    }
  }
);

// GET /api/subscriptions
// List current user's subscriptions
router.get(
  '/',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const subs = await Subscription
        .find({ user: req.user._id })
        .populate('plan');
      res.json(subs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching subscriptions.' });
    }
  }
);

export default router;
