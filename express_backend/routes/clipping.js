// routes/clipping.js
// All clipper-facing routes for ClippingCampaign (the "clipping" campaign type)
//
// KEY FIXES vs previous version:
//  1. JOIN: ClipSubmission now created with campaignType:'ClippingCampaign' so
//     pre-validate hook skips the old Campaign lookup → no more "Could not join" error.
//  2. EARNINGS RATE: costPerThousand stored on campaign is the ADVERTISER charge rate.
//     Clippers earn 40% of that. All responses now include clipperCpm field.
//  3. PAYOUT CALCULATION: reward credited to clipper wallet = 40% of CPM rate.
//     Platform keeps 60%. Both tracked properly.
//
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

import ClippingCampaign from '../models/ClippingCampaign.js';
import ClipSubmission from '../models/ClipSubmission.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { requireAuth, requireClipper } from '../middleware/auth.js';

const router = express.Router();

// Clipper earns 40% of what advertiser pays; platform keeps 60%
const CLIPPER_REVENUE_SHARE = 0.40;

// ─── Multer config for proof uploads ────────────────────────────────────────
const proofDir = path.join(process.cwd(), 'uploads/clipping-proofs');
fs.mkdirSync(proofDir, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, proofDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniq + ext);
  },
});
const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});
const getRelPath = (f) =>
  f ? `/uploads/clipping-proofs/${path.basename(f.path)}` : undefined;

// Helper: compute clipper CPM from the advertiser-facing CPM
const getClipperCpm = (advertiserCpm) => advertiserCpm * CLIPPER_REVENUE_SHARE;


// ─── BROWSE ─────────────────────────────────────────────────────────────────

/**
 * GET /api/clipping/available
 * List active clipping campaigns a clipper can browse & join.
 */
router.get('/available', requireAuth, async (req, res) => {
  try {
    const {
      search = '', platforms = '', categories = '',
      sortBy = 'newest', page = 1, limit = 10,
    } = req.query;

    const filter = { status: 'active' };
    if (search)     filter.title = { $regex: search, $options: 'i' };
    if (platforms)  filter.platforms = { $in: platforms.split(',').map((p) => p.trim()) };
    if (categories) filter.categories = { $in: categories.split(',').map((c) => c.trim()) };

    const sortMap = {
      newest:     { createdAt: -1 },
      budget_high:{ budget: -1 },
      budget_low: { budget: 1 },
      cpm_high:   { costPerThousand: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;
    const skip = (Number(page) - 1) * Number(limit);

    const [campaigns, total] = await Promise.all([
      ClippingCampaign.find(filter)
        .populate('advertiser', 'firstName lastName company email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ClippingCampaign.countDocuments(filter),
    ]);

    // Annotate each campaign with whether this clipper has already joined
    const clipperId = req.user._id;
    const campaignIds = campaigns.map((c) => c._id);
    const joined = await ClipSubmission.find({
      campaign: { $in: campaignIds },
      campaignType: 'ClippingCampaign',
      clipper: clipperId,
    }).select('campaign').lean();
    const joinedSet = new Set(joined.map((j) => j.campaign.toString()));

    const enriched = campaigns.map((c) => ({
      ...c,
      hasJoined: joinedSet.has(c._id.toString()),
      remainingBudget: c.budget - (c.totalSpent || 0),
      completionPct: c.estimatedViews > 0
        ? Math.min(100, Math.round(((c.totalViews || 0) / c.estimatedViews) * 100))
        : 0,
      // Clipper sees their earning rate (40%), not advertiser charge
      clipperCpm: getClipperCpm(c.costPerThousand),
    }));

    res.json({
      campaigns: enriched,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('clipping/available error:', err);
    res.status(500).json({ error: 'Could not fetch campaigns.' });
  }
});

/**
 * GET /api/clipping/stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totalCampaigns, budgetAgg] = await Promise.all([
      ClippingCampaign.countDocuments({ status: 'active' }),
      ClippingCampaign.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$budget' },
          },
        },
      ]),
    ]);

    // Build separate NGN and USDT totals
    const ngnEntry  = budgetAgg.find((r) => r._id === 'NGN');
    const usdtEntry = budgetAgg.find((r) => r._id === 'USDT');
    const totalBudgetNGN  = ngnEntry?.total  || 0;
    const totalBudgetUSDT = usdtEntry?.total || 0;

    res.json({
      totalCampaigns,
      totalBudget: totalBudgetNGN,           // kept for backward-compat
      totalBudgetNGN,
      totalBudgetUSDT,
    });
  } catch (err) {
    console.error('clipping/stats error:', err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

/**
 * GET /api/clipping/my/submissions
 */
router.get('/my/submissions', requireAuth, requireClipper, async (req, res) => {
  try {
    const subs = await ClipSubmission.find({
      clipper: req.user._id,
      campaignType: 'ClippingCampaign',
    }).sort({ createdAt: -1 }).lean();

    const campaignIds = subs.map((s) => s.campaign);
    const campaigns = await ClippingCampaign.find({ _id: { $in: campaignIds } })
      .select('title status budget totalSpent totalViews estimatedViews costPerThousand currency platforms')
      .lean();
    const campMap = Object.fromEntries(campaigns.map((c) => [c._id.toString(), c]));

    const formatted = subs.map((s) => {
      const camp = campMap[s.campaign?.toString()];
      if (!camp) return null;

      const approvedProofs = (s.proofs || []).filter((p) => p.status === 'approved');
      const totalVerifiedViews = approvedProofs.reduce((acc, p) => acc + (p.verifiedViews || 0), 0);
      const totalEarned = approvedProofs.reduce((acc, p) => acc + (p.rewardAmount || 0), 0);
      const pendingProofs = (s.proofs || []).filter((p) => p.status === 'pending').length;

      return {
        ...s,
        campaign: {
          _id: camp._id,
          title: camp.title,
          status: camp.status,
          currency: camp.currency,
          costPerThousand: camp.costPerThousand,
          clipperCpm: getClipperCpm(camp.costPerThousand),
          platforms: camp.platforms,
        },
        totalVerifiedViews,
        totalEarned,
        pendingProofs,
      };
    }).filter(Boolean);

    res.json(formatted);
  } catch (err) {
    console.error('my/submissions error:', err);
    res.status(500).json({ error: 'Could not fetch submissions.' });
  }
});

/**
 * GET /api/clipping/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await ClippingCampaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName company email')
      .lean();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.status !== 'active')
      return res.status(403).json({ error: 'Campaign is not active.' });

    const submission = await ClipSubmission.findOne({
      campaign: campaign._id,
      campaignType: 'ClippingCampaign',
      clipper: req.user._id,
    }).lean();

    res.json({
      ...campaign,
      hasJoined: !!submission,
      submission: submission || null,
      remainingBudget: campaign.budget - (campaign.totalSpent || 0),
      completionPct: campaign.estimatedViews > 0
        ? Math.min(100, Math.round(((campaign.totalViews || 0) / campaign.estimatedViews) * 100))
        : 0,
      clipperCpm: getClipperCpm(campaign.costPerThousand),
    });
  } catch (err) {
    console.error('clipping/:id error:', err);
    res.status(500).json({ error: 'Could not fetch campaign.' });
  }
});


// ─── JOIN ────────────────────────────────────────────────────────────────────

/**
 * POST /api/clipping/:id/join
 * FIX: Creates ClipSubmission with campaignType:'ClippingCampaign'
 * so the pre-validate hook skips the old Campaign collection lookup.
 */
router.post('/:id/join', requireAuth, requireClipper, async (req, res) => {
  try {
    const campaign = await ClippingCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.status !== 'active')
      return res.status(403).json({ error: 'Campaign is not active.' });

    const remaining = campaign.budget - (campaign.totalSpent || 0);
    if (remaining <= 0)
      return res.status(403).json({ error: 'Campaign budget is fully used.' });

    const clipperId = req.user._id;

    let submission = await ClipSubmission.findOne({
      campaign: campaign._id,
      campaignType: 'ClippingCampaign',
      clipper: clipperId,
    });

    if (submission) {
      return res.status(200).json({ message: 'Already joined.', submission });
    }

    // ✅ THE FIX: campaignType: 'ClippingCampaign' bypasses the old Campaign lookup
    submission = await ClipSubmission.create({
      campaign: campaign._id,
      campaignType: 'ClippingCampaign',
      clipper: clipperId,
      proofs: [],
    });

    await ClippingCampaign.findByIdAndUpdate(campaign._id, {
      $inc: { clipsCreated: 1 },
    });

    // Send notification to clipper
    try {
      await Notification.create({
        user: clipperId,
        title: '🎉 Campaign Joined!',
        message: `You've joined "${campaign.title}". Post the video on your platforms and submit proof to earn!`,
        type: 'clipping_joined',
      });
    } catch (_) { /* non-critical */ }

    res.status(201).json({ message: 'Joined successfully!', submission });
  } catch (err) {
    console.error('clipping/join error:', err);
    res.status(500).json({ error: 'Could not join campaign.' });
  }
});


// ─── SUBMIT PROOF ────────────────────────────────────────────────────────────

/**
 * POST /api/clipping/:id/submit-proof
 */
router.post(
  '/:id/submit-proof',
  requireAuth,
  requireClipper,
  uploadProof.any(),
  async (req, res) => {
    try {
      const { platform, submissionUrl, views } = req.body;
      const campaignId = req.params.id;
      const clipperId = req.user._id;

      if (!platform) return res.status(400).json({ error: 'Platform is required.' });

      const campaign = await ClippingCampaign.findById(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
      if (campaign.status !== 'active')
        return res.status(403).json({ error: 'Campaign is not active.' });

      const submission = await ClipSubmission.findOne({
        campaign: campaignId,
        campaignType: 'ClippingCampaign',
        clipper: clipperId,
      });
      if (!submission)
        return res.status(403).json({ error: 'You must join the campaign before submitting.' });

      const platformLower = platform.trim().toLowerCase();
      const allowed = (campaign.platforms || []).map((p) => p.toLowerCase());
      if (allowed.length && !allowed.includes(platformLower)) {
        return res.status(400).json({ error: `Platform "${platform}" is not allowed for this campaign.` });
      }

      const alreadyHas = submission.proofs.some(
        (p) => p.platform?.toLowerCase() === platformLower
      );
      if (alreadyHas) {
        return res.status(409).json({
          error: `You already submitted for ${platform}. Use the "Update Views" option to update your view count.`,
        });
      }

      const proofVideoFile = req.files?.find((f) => f.fieldname === 'proofVideo');
      const proofImageFile = req.files?.find((f) => f.fieldname === 'proofImage');
      const proofVideo = getRelPath(proofVideoFile);
      const proofImage = getRelPath(proofImageFile);
      const viewsNum = Number(views) || 0;
      const isWhatsApp = platformLower === 'whatsapp';

      if (isWhatsApp) {
        if (submissionUrl) return res.status(400).json({ error: 'WhatsApp submissions cannot include a URL.' });
        if (!proofVideo && !proofImage)
          return res.status(400).json({ error: 'WhatsApp requires a screenshot or video proof.' });
      } else {
        if (!submissionUrl?.trim()) return res.status(400).json({ error: 'Post URL is required.' });
        if (!/^https:\/\//i.test(submissionUrl.trim()))
          return res.status(400).json({ error: 'Post URL must start with https://' });

        const dup = await ClipSubmission.findOne({ 'proofs.submissionUrl': submissionUrl.trim() });
        if (dup)
          return res.status(409).json({ error: 'This link has already been submitted by another clipper.' });
      }

      submission.proofs.push({
        platform: platform.trim(),
        submissionUrl: isWhatsApp ? null : submissionUrl.trim(),
        views: viewsNum,
        proofVideo,
        proofImage,
        status: 'pending',
        verifiedViews: 0,
        rewardAmount: 0,
      });

      await submission.save();
      res.status(201).json({ message: 'Proof submitted!', submission });
    } catch (err) {
      console.error('clipping/submit-proof error:', err);
      res.status(500).json({ error: 'Could not submit proof.' });
    }
  }
);


// ─── UPDATE VIEWS ────────────────────────────────────────────────────────────

/**
 * PATCH /api/clipping/submissions/:submissionId/proofs/:proofId/update-views
 */
router.patch(
  '/submissions/:submissionId/proofs/:proofId/update-views',
  requireAuth,
  requireClipper,
  uploadProof.any(),
  async (req, res) => {
    try {
      const { submissionId, proofId } = req.params;
      const { views, submissionUrl } = req.body;

      const submission = await ClipSubmission.findById(submissionId);
      if (!submission) return res.status(404).json({ error: 'Submission not found.' });
      if (String(submission.clipper) !== String(req.user._id))
        return res.status(403).json({ error: 'Not your submission.' });

      const proof = submission.proofs.id(proofId);
      if (!proof) return res.status(404).json({ error: 'Proof not found.' });

      const newViews = Number(views);
      if (!views || isNaN(newViews) || newViews <= 0)
        return res.status(400).json({ error: 'A valid view count is required.' });

      // Rejected proofs: clipper is resubmitting from scratch — skip the > verifiedViews guard.
      // For pending/approved: new count must exceed what's already been verified (incremental pay).
      const isRejected = proof.status === 'rejected';
      if (!isRejected && newViews <= (proof.verifiedViews || 0)) {
        return res.status(400).json({
          error: `New view count (${newViews.toLocaleString()}) must be higher than last verified count (${(proof.verifiedViews || 0).toLocaleString()}).`,
        });
      }

      const proofImage = getRelPath(req.files?.find((f) => f.fieldname === 'proofImage'));
      const proofVideo = getRelPath(req.files?.find((f) => f.fieldname === 'proofVideo'));

      proof.views = newViews;
      if (proofImage) proof.proofImage = proofImage;
      if (proofVideo) proof.proofVideo = proofVideo;
      if (submissionUrl?.trim()) {
        if (!/^https:\/\//i.test(submissionUrl.trim()))
          return res.status(400).json({ error: 'URL must start with https://' });
        proof.submissionUrl = submissionUrl.trim();
      }

      proof.status = 'pending'; // Re-queue for admin verification
      if (isRejected) proof.adminNote = ''; // Clear rejection note when resubmitting

      await submission.save();
      res.json({ message: 'View count updated. Awaiting admin verification.', submission });
    } catch (err) {
      console.error('update-views error:', err);
      res.status(500).json({ error: 'Could not update view count.' });
    }
  }
);


// ─── ADMIN: List all clipping submissions ────────────────────────────────────

/**
 * GET /api/clipping/admin/submissions
 * Admin sees all clipping submissions with pagination + filtering.
 */
router.get('/admin/submissions', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matchFilter = { campaignType: 'ClippingCampaign' };

    let subs = await ClipSubmission.find(matchFilter)
      .populate('clipper', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Hydrate campaign info
    const campaignIds = subs.map((s) => s.campaign);
    const campaigns = await ClippingCampaign.find({ _id: { $in: campaignIds } })
      .select('title status costPerThousand currency advertiser platforms')
      .lean();
    const campMap = Object.fromEntries(campaigns.map((c) => [c._id.toString(), c]));

    // Flatten to proof-level rows for the admin table
    let rows = [];
    for (const sub of subs) {
      const camp = campMap[sub.campaign?.toString()];
      for (const proof of sub.proofs || []) {
        if (status && proof.status !== status) continue;
        if (search) {
          const name = `${sub.clipper?.firstName || ''} ${sub.clipper?.lastName || ''}`.toLowerCase();
          const title = (camp?.title || '').toLowerCase();
          if (!name.includes(search.toLowerCase()) && !title.includes(search.toLowerCase())) continue;
        }
        rows.push({
          submissionId: sub._id,
          proofId: proof._id,
          clipperName: `${sub.clipper?.firstName || ''} ${sub.clipper?.lastName || ''}`.trim() || sub.clipper?.email,
          clipperId: sub.clipper?._id,
          clipperEmail: sub.clipper?.email,
          campaignTitle: camp?.title || 'Unknown',
          campaignId: sub.campaign,
          campaignCurrency: camp?.currency || 'NGN',
          advertiserCpm: camp?.costPerThousand || 0,
          clipperCpm: getClipperCpm(camp?.costPerThousand || 0),
          platform: proof.platform,
          submissionUrl: proof.submissionUrl,
          proofImage: proof.proofImage,
          proofVideo: proof.proofVideo,
          reportedViews: proof.views || 0,
          verifiedViews: proof.verifiedViews || 0,
          rewardAmount: proof.rewardAmount || 0,
          status: proof.status,
          adminNote: proof.adminNote,
          lastVerified: proof.lastVerified,
          dateSubmitted: proof.createdAt,
          dateUpdated: proof.updatedAt,
        });
      }
    }

    const total = await ClipSubmission.countDocuments(matchFilter);
    res.json({ rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('admin/submissions list error:', err);
    res.status(500).json({ error: 'Could not fetch submissions.' });
  }
});


// ─── ADMIN: Approve / reject a clipping proof ────────────────────────────────

/**
 * PATCH /api/clipping/admin/submissions/:submissionId/proofs/:proofId/review
 * Approve or reject a proof.
 * On approve: clipper gets 40% of CPM rate; platform keeps 60%.
 */
router.patch(
  '/admin/submissions/:submissionId/proofs/:proofId/review',
  requireAuth,
  async (req, res) => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admins only.' });

    try {
      const { submissionId, proofId } = req.params;
      const { action, adminNote, verifiedViews } = req.body;

      if (!['approve', 'reject'].includes(action))
        return res.status(400).json({ error: 'action must be "approve" or "reject".' });

      const submission = await ClipSubmission.findById(submissionId);
      if (!submission) return res.status(404).json({ error: 'Submission not found.' });

      const proof = submission.proofs.id(proofId);
      if (!proof) return res.status(404).json({ error: 'Proof not found.' });

      const campaign = await ClippingCampaign.findById(submission.campaign);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

      if (action === 'reject') {
        proof.status = 'rejected';
        proof.adminNote = adminNote || '';
        await submission.save();

        // Notify clipper
        try {
          await Notification.create({
            user: submission.clipper,
            title: '❌ Proof Rejected',
            message: `Your ${proof.platform} proof for "${campaign.title}" was rejected. ${adminNote ? `Reason: ${adminNote}` : 'Please resubmit with better evidence.'}`,
            type: 'clipping_rejected',
          });
        } catch (_) {}

        return res.json({ message: 'Proof rejected.', submission });
      }

      // ── APPROVE ──
      const newVerified = Number(verifiedViews) || proof.views;
      const previousVerified = proof.verifiedViews || 0;
      const incrementalViews = Math.max(0, newVerified - previousVerified);

      // Advertiser pays full CPM; clipper gets 40%, platform keeps 60%
      const totalReward    = (incrementalViews * campaign.costPerThousand) / 1000;
      const clipperReward  = totalReward * CLIPPER_REVENUE_SHARE;
      const platformReward = totalReward * (1 - CLIPPER_REVENUE_SHARE);
      const isNGN          = campaign.currency === 'NGN';
      const sym            = isNGN ? '₦' : '$';

      proof.status       = 'approved';
      proof.adminNote    = adminNote || '';
      proof.verifiedViews = newVerified;
      proof.rewardAmount  = (proof.rewardAmount || 0) + clipperReward;
      proof.lastVerified  = new Date();

      // ── Deduct from advertiser escrow (totalReward = full advertiser cost) ─
      // Clipping campaigns lock budget in escrow when created (lockEscrowNGN/USDT).
      // Each approval draws down that escrow proportionally.
      if (totalReward > 0) {
        const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser });
        if (advertiserWallet) {
          if (isNGN) {
            const deductable = Math.min(totalReward, advertiserWallet.escrowLocked || 0);
            advertiserWallet.escrowLocked = (advertiserWallet.escrowLocked || 0) - deductable;
          } else {
            const deductable = Math.min(totalReward, advertiserWallet.usdtEscrowLocked || 0);
            advertiserWallet.usdtEscrowLocked = (advertiserWallet.usdtEscrowLocked || 0) - deductable;
          }
          await advertiserWallet.save();
        }
      }

      // Update campaign totals (totalSpent = full advertiser cost for budget tracking)
      await ClippingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: { totalViews: incrementalViews, totalSpent: totalReward },
      });

      // ── Credit clipper wallet (40%) ────────────────────────────────────────
      if (clipperReward > 0) {
        let clipperWallet = await Wallet.findOne({ user: submission.clipper });
        if (!clipperWallet) {
          clipperWallet = await Wallet.create({ user: submission.clipper, balance: 0, usdtBalance: 0 });
        }

        if (isNGN) {
          clipperWallet.balance = (clipperWallet.balance || 0) + clipperReward;
        } else {
          clipperWallet.usdtBalance = (clipperWallet.usdtBalance || 0) + clipperReward;
        }
        await clipperWallet.save();

        await Transaction.create({
          user: submission.clipper,
          type: 'clipping_reward',
          amount: clipperReward,
          currency: campaign.currency,
          description: `Clipping reward — ${proof.platform} — ${incrementalViews.toLocaleString()} views (${campaign.title})`,
          status: 'completed',
          reference: `CLIP-${submissionId}-${proofId}-${Date.now()}`,
        });

        submission.rewardAmount = (submission.rewardAmount || 0) + clipperReward;
      }

      // ── Credit platform wallet (60%) — non-critical ────────────────────────
      try {
        // Platform user is role:'platform' — same pattern used in adminSubmissions.js
        let platformUser = await User.findOne({ role: 'platform' });
        if (!platformUser) {
          platformUser = await User.create({
            role: 'platform',
            email: 'platform@clippapay.com',
            passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN',
            firstName: 'ClippaPay',
            lastName: 'Platform',
          });
        }
        let platformWallet = await Wallet.findOne({ user: platformUser._id });
        if (!platformWallet) {
          platformWallet = await Wallet.create({ user: platformUser._id, balance: 0, usdtBalance: 0 });
        }
        if (isNGN) {
          platformWallet.balance = (platformWallet.balance || 0) + platformReward;
        } else {
          platformWallet.usdtBalance = (platformWallet.usdtBalance || 0) + platformReward;
        }
        await platformWallet.save();

        await Transaction.create({
          user: platformUser._id,
          type: 'commission',
          amount: platformReward,
          currency: campaign.currency,
          description: `Platform share (60%) — ${proof.platform} — ${incrementalViews.toLocaleString()} views (${campaign.title})`,
          status: 'completed',
          reference: `PLATFORM-CLIP-${submissionId}-${proofId}-${Date.now()}`,
        });
      } catch (platformErr) {
        // Non-critical — clipper payout already committed above
        console.warn('Platform wallet update warning:', platformErr.message);
      }

      await submission.save();

      // Notify clipper
      try {
        await Notification.create({
          user: submission.clipper,
          title: '✅ Proof Approved!',
          message: `Your ${proof.platform} proof for "${campaign.title}" was approved! ${sym}${clipperReward.toFixed(2)} has been credited to your ${campaign.currency} wallet.`,
          type: 'clipping_approved',
        });
      } catch (_) {}

      res.json({
        message: `Proof approved. Clipper credited ${sym}${clipperReward.toFixed(2)} (platform kept ${sym}${platformReward.toFixed(2)}).`,
        incrementalViews,
        clipperReward,
        platformReward,
        submission,
      });
    } catch (err) {
      console.error('admin review error:', err);
      res.status(500).json({ error: 'Could not review proof.' });
    }
  }
);

export default router;
