// File: express_backend/routes/advertiserStats.js

import express from 'express';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js';
import Campaign from '../models/Campaign.js';
import ClippingCampaign from '../models/ClippingCampaign.js';
import Submission from '../models/Submission.js';
import Wallet from '../models/Wallet.js';

const router = express.Router();

/**
 * GET /api/advertiser/stats
 * Returns:
 *   totalCampaigns        : number  (UGC campaigns)
 *   totalClippingCampaigns: number  (Clipping campaigns)
 *   totalViewsBought      : number  (sum of approved verifiedViews)
 *   walletBalance         : number  (NGN available)
 *   fundsInEscrow         : number  (NGN locked)
 *   usdtBalance           : number  (USDT available)
 *   usdtEscrowLocked      : number  (USDT locked)
 *   avgCPV                : number
 *   totalClippers         : number
 */
router.get(
  '/stats',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const advertiserId = req.user._id;

      // 1) UGC campaigns + Clipping campaigns in parallel
      const [campaigns, clippingCampaigns] = await Promise.all([
        Campaign.find({ advertiser: advertiserId }),
        ClippingCampaign.find({ advertiser: advertiserId }),
      ]);

      const totalCampaigns         = campaigns.length;
      const totalClippingCampaigns = clippingCampaigns.length;
      const campaignIds            = campaigns.map(c => c._id);

      // 2) Submissions → views + unique clippers
      const subs = await Submission.find({ campaign: { $in: campaignIds } });
      let totalViewsBought = 0;
      const clippersSet = new Set();
      subs.forEach(sub => {
        clippersSet.add(sub.clipper.toString());
        sub.updates.forEach(u => {
          if (u.status === 'approved' && typeof u.verifiedViews === 'number') {
            totalViewsBought += u.verifiedViews;
          }
        });
      });
      const totalClippers = clippersSet.size;

      // 3) Average CPV (UGC campaigns only)
      const avgCPV =
        totalCampaigns > 0
          ? campaigns.reduce((sum, c) => sum + c.rate_per_view, 0) / totalCampaigns
          : 0;

      // 4) Wallet — NGN + USDT
      const wallet           = await Wallet.findOne({ user: advertiserId });
      const walletBalance    = wallet?.balance          || 0;
      const fundsInEscrow    = wallet?.escrowLocked     || 0;
      const usdtBalance      = wallet?.usdtBalance      || 0;
      const usdtEscrowLocked = wallet?.usdtEscrowLocked || 0;

      return res.json({
        totalCampaigns,
        totalClippingCampaigns,
        totalViewsBought,
        walletBalance,
        fundsInEscrow,
        usdtBalance,
        usdtEscrowLocked,
        avgCPV,
        totalClippers,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching advertiser stats.' });
    }
  }
);

export default router;