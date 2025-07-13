// File: express_backend/routes/plans.js

import express from 'express';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/plans
 * List all subscription plans
 */
router.get(
  '/',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find({});
      res.json(plans);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load plans.' });
    }
  }
);

/**
 * GET /api/plans/market/:market
 * List plans for a specific market ('nigeria'|'global')
 */
router.get(
  '/market/:market',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { market } = req.params;
      if (!['nigeria','global'].includes(market)) {
        return res.status(400).json({ error: 'Invalid market.' });
      }
      const plans = await SubscriptionPlan.find({ market });
      res.json(plans);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load plans.' });
    }
  }
);

export default router;
