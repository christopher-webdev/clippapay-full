// routes/adminSubmissions.js

import express from 'express';
import ClipSubmission from '../models/ClipSubmission.js';
import Campaign from '../models/Campaign.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
const router = express.Router();
const PLATFORM_CPM = 400; // ₦400 per 1000 views

// GET all proofs across all submissions (admin table)
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const submissions = await ClipSubmission.find({})
      .populate([
        { path: 'clipper', select: 'name email' },
        { path: 'campaign', select: 'title views_left budget_remaining' }
      ])
      .sort({ createdAt: -1 });

    // Flatten all proofs for admin UI (each proof gets its own row, with its _id)
    const result = submissions.flatMap(sub =>
      (sub.proofs || []).map((proof) => ({
        submissionId: sub._id,
        proofId: proof._id, // Unique proof _id
        clipperName: sub.clipper?.name || sub.clipper?.email || 'Unknown Clipper',
        campaignTitle: sub.campaign?.title || 'Unknown Campaign',
        platform: proof.platform,
        proofUrl: proof.proofVideo || proof.proofImage || proof.submissionUrl,
        proofVideo: proof.proofVideo,
        proofImage: proof.proofImage,
        submissionUrl: proof.submissionUrl,
        reportedViews: proof.views,
        verifiedViews: proof.verifiedViews,
        dateSubmitted: sub.createdAt,
        status: proof.status,
        adminNote: proof.adminNote || "",
        rewardAmount: proof.rewardAmount || 0,
        // ADD THESE:
        campaignViewsLeft: sub.campaign?.views_left,
        campaignBudgetRemaining: sub.campaign?.budget_remaining,
      }))
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Approve a specific proof by proof _id
router.post('/:submissionId/proof/:proofId/verify',requireAdminAuth, async (req, res) => {
  try {
    const { verifiedViews, note } = req.body;
    if (!Number.isFinite(verifiedViews) || verifiedViews < 0)
      return res.status(400).json({ error: 'Invalid view count' });

    const { submissionId, proofId } = req.params;

    // Find submission
    const sub = await ClipSubmission.findById(submissionId).populate('campaign clipper');
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    // Find proof by _id
    const proof = sub.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found' });

    // Protect against reducing views (clipper error or fraud)
    const lastVerified = proof.verifiedViews || 0;
    const newVerified = Number(verifiedViews);

    if (newVerified < lastVerified)
      return res.status(400).json({ error: "Submitted view count can't be less than last approved" });

    const deltaViews = newVerified - lastVerified;
    if (deltaViews <= 0)
      return res.status(400).json({ error: "No new views to approve" });

    // Get campaign and wallets
    const campaign = await Campaign.findById(sub.campaign._id).populate('advertiser');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    let advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id });
    if (!advertiserWallet) advertiserWallet = await Wallet.create({ user: campaign.advertiser._id, balance: 0, escrowLocked: 0 });

    let clipperWallet = await Wallet.findOne({ user: sub.clipper._id });
    if (!clipperWallet) clipperWallet = await Wallet.create({ user: sub.clipper._id, balance: 0, escrowLocked: 0 });

    let platformUser = await User.findOne({ role: 'platform' });
    if (!platformUser) platformUser = await User.create({ role: 'platform', email: 'platform@clippapay.com', passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN', isSuperAdmin: false, company: 'ClippaPay Platform' });

    let platformWallet = await Wallet.findOne({ user: platformUser._id });
    if (!platformWallet) platformWallet = await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

    // Calculate payouts **for deltaViews**
    const CPM = campaign.clipper_cpm || 200;
    const payoutClipper = (deltaViews * CPM) / 1000;
    const payoutPlatform = (deltaViews * PLATFORM_CPM) / 1000;
    const totalDeduct = payoutClipper + payoutPlatform;

    if (advertiserWallet.escrowLocked < totalDeduct)
      return res.status(400).json({ error: 'Insufficient escrow balance' });

    // Approve this proof, update only the incremental part
    proof.status = 'approved';
    proof.verifiedViews = newVerified;
    proof.rewardAmount = (proof.rewardAmount || 0) + payoutClipper; // accumulate
    proof.adminNote = note || "";
    proof.lastVerified = new Date();

    // Save submission (with proof update)
    await sub.save();

    // Deduct campaign views & budget using deltaViews
    await campaign.deductViewsAndBudget(deltaViews);

    // Deduct from advertiser escrow
    advertiserWallet.escrowLocked -= totalDeduct;
    await advertiserWallet.save();

    // Credit clipper
    clipperWallet.balance += payoutClipper;
    await clipperWallet.save();

    // Credit platform
    platformWallet.balance += payoutPlatform;
    await platformWallet.save();

    res.json({
      submissionId: sub._id,
      proofId: proof._id,
      clipperName: sub.clipper.name || sub.clipper.email,
      campaignTitle: campaign.title,
      platform: proof.platform,
      proofUrl: proof.proofVideo || proof.proofImage || proof.submissionUrl,
      reportedViews: proof.views,
      verifiedViews: proof.verifiedViews,
      status: proof.status,
      rewardAmount: proof.rewardAmount,
      adminNote: proof.adminNote,
      campaignStatus: campaign.status,
      campaignViewsLeft: campaign.views_left,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});


// Reject a specific proof by proof _id
router.post('/:submissionId/proof/:proofId/reject',requireAdminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const { submissionId, proofId } = req.params;

    const sub = await ClipSubmission.findById(submissionId).populate('campaign clipper');
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const proof = sub.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found' });

    if (proof.status === 'approved')
      return res.status(400).json({ error: 'Cannot reject an approved proof' });

    proof.status = 'rejected';
    proof.adminNote = note || "Rejected by admin";
    proof.lastVerified = new Date();
    await sub.save();

    res.json({
      submissionId: sub._id,
      proofId: proof._id,
      clipperName: sub.clipper.name || sub.clipper.email,
      campaignTitle: sub.campaign.title,
      platform: proof.platform,
      proofUrl: proof.proofVideo || proof.proofImage || proof.submissionUrl,
      reportedViews: proof.views,
      status: proof.status,
      adminNote: proof.adminNote,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

export default router;

