// routes/adminStats.js
// EXTENDED:
//  - ugcCampaigns / clippingCampaigns counts (separate)
//  - activeClippingCampaigns / pendingClippingCampaigns
//  - NGN + USDT pool totals across all wallets
//  - NGN + USDT escrow totals
//  - NGN + USDT deposit/withdrawal breakdowns
//  - totalClippingViews, totalClippingSpent
//  - pendingClippingCampaigns (waiting_for_approval)
//  - platformWalletNGN + platformWalletUSDT

import express from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import User           from '../models/User.js';
import Campaign       from '../models/Campaign.js';
import ClippingCampaign from '../models/ClippingCampaign.js';
import Submission     from '../models/Submission.js';
import Withdrawal     from '../models/WithdrawalRequest.js';
import Transaction    from '../models/Transaction.js';
import Subscription   from '../models/Subscription.js';
import Wallet         from '../models/Wallet.js';
import ClipSubmission from '../models/ClipSubmission.js';
import DepositRequest from '../models/DepositRequest.js';

const router = express.Router();

/**
 * GET /api/admin/stats
 */
router.get('/', requireAdminAuth, async (req, res) => {
  try {

    // ── 1. USERS ─────────────────────────────────────────────────────────────
    const [
      totalClippers,
      totalAdvertisers,
      totalAdminWorkers,
      totalSuperAdmins,
    ] = await Promise.all([
      User.countDocuments({ role: 'clipper' }),
      User.countDocuments({ role: 'advertiser' }),
      User.countDocuments({ role: 'admin', isSuperAdmin: false }),
      User.countDocuments({ isSuperAdmin: true }),
    ]);

    // ── 2. UGC CAMPAIGNS ─────────────────────────────────────────────────────
    const [
      totalUgcCampaigns,
      activeUgcCampaigns,
      pendingUgcCampaigns,
      videoSubmittedCampaigns,
      completedUgcCampaigns,
      totalApprovedVideos,
    ] = await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'pending_approval' }),
      Campaign.countDocuments({ status: { $in: ['video_submitted', 'revision_requested'] } }),
      Campaign.countDocuments({ status: 'completed' }),
      // approved video submissions across all campaigns
      Campaign.aggregate([
        { $unwind: '$videoSubmissions' },
        { $match: { 'videoSubmissions.status': 'approved' } },
        { $count: 'total' },
      ]).then(r => r[0]?.total || 0),
    ]);

    // No PGC — totalCampaigns = UGC only
    const totalCampaigns  = totalUgcCampaigns;
    const activeCampaigns = activeUgcCampaigns;
    // Remove PGC fields — set to 0 for backward compat
    const totalPgcCampaigns      = 0;
    const totalApprovedPgcVideos = 0;

    // ── 3. CLIPPING CAMPAIGNS ─────────────────────────────────────────────────
    const [
      totalClippingCampaigns,
      activeClippingCampaigns,
      pendingClippingCampaigns,
      clippingAggResult,
    ] = await Promise.all([
      ClippingCampaign.countDocuments(),
      ClippingCampaign.countDocuments({ status: 'active' }),
      ClippingCampaign.countDocuments({ status: 'waiting_for_approval' }),
      // Sum budget, totalSpent, totalViews split by currency
      ClippingCampaign.aggregate([
        {
          $group: {
            _id:            '$currency',
            totalBudget:    { $sum: '$budget' },
            totalSpent:     { $sum: { $ifNull: ['$totalSpent', 0] } },
            totalViews:     { $sum: { $ifNull: ['$totalViews', 0] } },
            campaignCount:  { $sum: 1 },
          },
        },
      ]),
    ]);

    // Parse clipping aggregation
    let clippingNGN = { budget: 0, spent: 0, views: 0 };
    let clippingUSDT = { budget: 0, spent: 0, views: 0 };
    clippingAggResult.forEach(r => {
      if (r._id === 'NGN')  clippingNGN  = { budget: r.totalBudget, spent: r.totalSpent, views: r.totalViews };
      if (r._id === 'USDT') clippingUSDT = { budget: r.totalBudget, spent: r.totalSpent, views: r.totalViews };
    });
    const totalClippingViews = clippingNGN.views + clippingUSDT.views;

    // ── 4. SUBMISSIONS / PROOFS ───────────────────────────────────────────────
    const [
      totalSubmissions,
      activeClipperPendingApproval,
    ] = await Promise.all([
      Submission.countDocuments(),
      ClipSubmission.aggregate([
        { $unwind: '$proofs' },
        { $match:  { 'proofs.status': 'pending' } },
        { $count:  'count' },
      ]).then(r => r[0]?.count || 0),
    ]);

    // ── 5. WITHDRAWALS ────────────────────────────────────────────────────────
    const [
      pendingWithdrawals,
      withdrawalAgg,
    ] = await Promise.all([
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.aggregate([
        { $match: { status: { $in: ['completed'] } } },
        {
          $group: {
            _id:    '$currency',
            total:  { $sum: '$amount' },
          },
        },
      ]),
    ]);

    let completedWithdrawalsNGN  = 0;
    let completedWithdrawalsUSDT = 0;
    withdrawalAgg.forEach(r => {
      if (r._id === 'NGN')  completedWithdrawalsNGN  = r.total;
      if (r._id === 'USDT') completedWithdrawalsUSDT = r.total;
    });

    // ── 6. DEPOSITS ───────────────────────────────────────────────────────────
    const [
      pendingDeposits,
      depositAgg,
    ] = await Promise.all([
      DepositRequest.countDocuments({ status: 'pending' }),
      DepositRequest.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id:   '$currency',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    let approvedDepositsNGN  = 0;
    let approvedDepositsUSDT = 0;
    depositAgg.forEach(r => {
      if (r._id === 'NGN')  approvedDepositsNGN  = r.total;
      if (r._id === 'USDT') approvedDepositsUSDT = r.total;
    });

    // ── 7. WALLET POOL (all users' wallets combined) ──────────────────────────
    const walletPoolAgg = await Wallet.aggregate([
      {
        $group: {
          _id:                  null,
          totalNGNBalance:      { $sum: '$balance' },
          totalNGNEscrow:       { $sum: '$escrowLocked' },
          totalUSDTBalance:     { $sum: '$usdtBalance' },
          totalUSDTEscrow:      { $sum: '$usdtEscrowLocked' },
        },
      },
    ]);

    const pool = walletPoolAgg[0] || {
      totalNGNBalance: 0, totalNGNEscrow: 0,
      totalUSDTBalance: 0, totalUSDTEscrow: 0,
    };

    // total escrow locked (NGN only — legacy field kept)
    const totalEscrowLocked     = pool.totalNGNEscrow;
    const totalUSDTEscrowLocked = pool.totalUSDTEscrow;

    // total circulating (available + escrow)
    const totalNGNInSystem  = pool.totalNGNBalance  + pool.totalNGNEscrow;
    const totalUSDTInSystem = pool.totalUSDTBalance + pool.totalUSDTEscrow;

    // legacy totalRevenue (NGN net)
    const totalRevenue = approvedDepositsNGN - completedWithdrawalsNGN;

    // ── 8. PLATFORM WALLET ────────────────────────────────────────────────────
    let platformWalletBalance = 0;
    let platformWalletUSDT    = 0;
    const platformUser = await User.findOne({ role: 'platform' });
    if (platformUser) {
      const pw = await Wallet.findOne({ user: platformUser._id });
      if (pw) {
        platformWalletBalance = pw.balance;
        platformWalletUSDT    = pw.usdtBalance;
      }
    }

    // ── 9. VIEWS SOLD (UGC campaigns — views_purchased - views_left) ─────────
    const viewsSoldAgg = await Campaign.aggregate([
      { $project: { viewsSold: { $subtract: ['$views_purchased', '$views_left'] } } },
      { $group:   { _id: null, total: { $sum: '$viewsSold' } } },
    ]);
    const totalViewsSold = viewsSoldAgg[0]?.total || 0;

    // ── 10. SUBSCRIPTIONS ─────────────────────────────────────────────────────
    const [pendingSubscriptions, totalSubscriptions] = await Promise.all([
      Subscription.countDocuments({ paymentStatus: 'pending' }),
      Subscription.countDocuments(),
    ]);

    // ── RESPONSE ──────────────────────────────────────────────────────────────
    return res.json({
      // Users
      totalClippers,
      totalAdvertisers,
      totalAdminWorkers,
      totalSuperAdmins,

      // UGC Campaigns
      totalCampaigns,
      totalUgcCampaigns,
      activeUgcCampaigns,
      pendingUgcCampaigns,        // waiting for adworker approval
      videoSubmittedCampaigns,    // video_submitted | revision_requested
      completedUgcCampaigns,
      totalApprovedVideos,        // approved videoSubmissions
      activeCampaigns,            // legacy alias

      // Clipping Campaigns
      totalClippingCampaigns,
      activeClippingCampaigns,
      pendingClippingCampaigns, // waiting_for_approval

      // Clipping financials
      clippingBudgetNGN:  clippingNGN.budget,
      clippingSpentNGN:   clippingNGN.spent,
      clippingBudgetUSDT: clippingUSDT.budget,
      clippingSpentUSDT:  clippingUSDT.spent,
      totalClippingViews,

      // Submissions / proofs
      totalSubmissions,
      activeClipperPendingApproval,

      // Deposits
      pendingDeposits,
      approvedDepositsNGN,
      approvedDepositsUSDT,

      // Withdrawals
      pendingWithdrawals,
      completedWithdrawalsNGN,
      completedWithdrawalsUSDT,

      // Wallet pool
      totalNGNBalance:      pool.totalNGNBalance,
      totalNGNEscrow:       pool.totalNGNEscrow,
      totalUSDTBalance:     pool.totalUSDTBalance,
      totalUSDTEscrow:      pool.totalUSDTEscrow,
      totalNGNInSystem,
      totalUSDTInSystem,

      // Platform wallet
      platformWalletBalance,
      platformWalletUSDT,

      // Legacy / combined
      totalRevenue,
      totalEscrowLocked,
      totalUSDTEscrowLocked,
      totalViewsSold,

      // Subscriptions
      pendingSubscriptions,
      totalSubscriptions,
    });

  } catch (err) {
    console.error('adminStats error:', err);
    res.status(500).json({ error: 'Failed to load admin stats.' });
  }
});

export default router;