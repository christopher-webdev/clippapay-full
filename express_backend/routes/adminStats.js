// File: express_backend/routes/adminStats.js

import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import Campaign from '../models/Campaign.js';
import Submission from '../models/Submission.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import Wallet from '../models/Wallet.js';
import ClipSubmission from '../models/ClipSubmission.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'


const router = express.Router();


/**
 * GET /api/admin/stats
 * Returns platform-level stats including:
 *   - totalClippers, totalAdvertisers, totalAdminWorkers, totalSuperAdmins
 *   - totalCampaigns, activeCampaigns
 *   - totalSubmissions
 *   - pendingWithdrawals
 *   - totalRevenue (sum of all deposits)
 *   - totalEscrowLocked (sum of all wallets' escrowLocked)
 *   - platformWalletBalance (balance in the ClippaPay platform wallet)
 *   - ...subscriptions stats
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Users by role
    const totalClippers      = await User.countDocuments({ role: 'clipper' });
    const totalAdvertisers   = await User.countDocuments({ role: 'advertiser' });
    const totalAdminWorkers  = await User.countDocuments({ role: 'admin', isSuperAdmin: false });
    const totalSuperAdmins   = await User.countDocuments({ isSuperAdmin: true });

    // Campaigns
    const totalCampaigns     = await Campaign.countDocuments();
    const activeCampaigns    = await Campaign.countDocuments({ status: 'active' });

    // Submissions
    const totalSubmissions   = await Submission.countDocuments();

    // Withdrawals
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

    // Revenue = sum of all deposits
    const revenueResult = await Transaction.aggregate([
      { $match: { type: 'deposit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Subscriptions
    const pendingSubscriptions = await Subscription.countDocuments({ paymentStatus: 'pending' });
    const activeClipperPendingApproval = await ClipSubmission.countDocuments({'proofs.status': 'pending'});
    const totalSubscriptions   = await Subscription.countDocuments();

    // TOTAL ESCROW (sum of all users' escrowLocked)
    const escrowResult = await Wallet.aggregate([
      { $group: { _id: null, totalEscrow: { $sum: "$escrowLocked" } } }
    ]);
    const totalEscrowLocked = escrowResult[0]?.totalEscrow || 0;

    // PLATFORM WALLET BALANCE
    const platformUser = await User.findOne({ role: 'platform' });
    let platformWalletBalance = 0;
    if (platformUser) {
      const platformWallet = await Wallet.findOne({ user: platformUser._id });
      if (platformWallet) {
        platformWalletBalance = platformWallet.balance;
      }
    }

    return res.json({
      totalClippers,
      totalAdvertisers,
      totalAdminWorkers,
      totalSuperAdmins,
      totalCampaigns,
      activeCampaigns,
      totalSubmissions,
      pendingWithdrawals,
      totalRevenue,
      pendingSubscriptions,
      activeClipperPendingApproval,
      totalSubscriptions,
      totalEscrowLocked,      // for dashboard
      platformWalletBalance,  // for dashboard
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load admin stats.' });
  }
});

export default router;
