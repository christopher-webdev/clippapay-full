// routes/adminSubmissions.js

import express from 'express';
import ClipSubmission from '../models/ClipSubmission.js';
import Campaign from '../models/Campaign.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
const router = express.Router();


// somewhere near the top of the file
const DEFAULTS = {
  normal: { CLIPPER_CPM: 500, PLATFORM_CPM: 700 },
  ugc:    { CLIPPER_CPM: 2000, PLATFORM_CPM: 3000 },
  pgc:    { CLIPPER_CPM: 5000, PLATFORM_CPM: 2500 }
};

function getCPMsForCampaign(campaign) {
  const kind = campaign.kind === 'ugc' ? 'ugc' : campaign.kind === 'pgc' ? 'pgc' : 'normal';
  // Prefer campaign’s stored CPMs when present
  const clipper = Number(campaign.clipper_cpm) || DEFAULTS[kind].CLIPPER_CPM;
  const platform = Number(campaign.platform_cpm) || DEFAULTS[kind].PLATFORM_CPM;
  return { kind, clipper, platform };
}



router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const submissions = await ClipSubmission.find({})
      .populate([
        { path: 'clipper', select: 'name email' },
        // 👇 include kind + CPM-related fields so we can expose them to the UI
        { path: 'campaign', select: 'title kind clipper_cpm rate_per_1000 views_left budget_remaining ugc' }
      ])
      .sort({ createdAt: -1 });

    const result = submissions.flatMap(sub => {
      const camp = sub.campaign;
      // Safe defaults if helper isn’t available
      let clipperCPM = camp?.clipper_cpm ?? undefined;
      let platformCPM;

      // If you have the same helper used in the verify endpoint, prefer it
      try {
        if (typeof getCPMsForCampaign === 'function' && camp) {
          const { clipper, platform } = getCPMsForCampaign(camp);
          clipperCPM = clipper;
          platformCPM = platform;
        }
      } catch (_) {
        // fall back to nothing; frontend will use its DEFAULT_CPMS
      }

      return (sub.proofs || []).map((proof) => ({
        submissionId: sub._id,
        proofId: proof._id,

        clipperName: sub.clipper?.name || sub.clipper?.email || 'Unknown Clipper',
        campaignTitle: camp?.title || 'Unknown Campaign',

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

        // existing summaries
        campaignViewsLeft: camp?.views_left,
        campaignBudgetRemaining: camp?.budget_remaining,

        // 🔥 add kind + CPMs (both styles)
        kind: camp?.kind,                 // for your current getKind fallback
        campaignKind: camp?.kind,         // camel
        campaign_kind: camp?.kind,        // snake
        clipper_cpm: clipperCPM,          // snake
        clipperCPM,                       // camel
        platform_cpm: platformCPM,        // snake (may be undefined; frontend will fallback)
        platformCPM,                      // camel
        ugc: camp?.ugc || undefined,      // lets UI treat UGC specially when needed
      }));
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Approve a specific proof by proof _id for PGC campaigns only
router.post('/:submissionId/proof/:proofId/approve', requireAdminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const { submissionId, proofId } = req.params;

    const sub = await ClipSubmission.findById(submissionId).populate('campaign clipper');
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const proof = sub.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found' });

    const campaign = await Campaign.findById(sub.campaign._id).populate('advertiser');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Ensure campaign is PGC
    const { kind: campaignKind, clipper: CLIPPER_CPM, platform: PLATFORM_CPM } = getCPMsForCampaign(campaign);
    if (campaignKind !== 'pgc') {
      return res.status(400).json({ error: 'This endpoint is for PGC campaigns only' });
    }

    // PGC uses flat fees, no views-based calculations
    if (req.body.verifiedViews !== undefined) {
      return res.status(400).json({ error: 'Views not applicable for PGC campaigns' });
    }

    // Calculate payouts using flat fees
    const payoutClipper = CLIPPER_CPM; // ₦5000
    const payoutPlatform = PLATFORM_CPM; // ₦2500
    const totalDeduct = payoutClipper + payoutPlatform;

    let advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id }) ||
      await Wallet.create({ user: campaign.advertiser._id, balance: 0, escrowLocked: 0 });

    let clipperWallet = await Wallet.findOne({ user: sub.clipper._id }) ||
      await Wallet.create({ user: sub.clipper._id, balance: 0, escrowLocked: 0 });

    let platformUser = await User.findOne({ role: 'platform' }) ||
      await User.create({ role: 'platform', email: 'platform@clippapay.com', passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN', isSuperAdmin: false, company: 'ClippaPay Platform' });

    let platformWallet = await Wallet.findOne({ user: platformUser._id }) ||
      await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

    if (advertiserWallet.escrowLocked < totalDeduct) {
      return res.status(400).json({ error: 'Insufficient escrow balance' });
    }

    // Update proof
    proof.status = 'approved';
    proof.rewardAmount = (proof.rewardAmount || 0) + payoutClipper;
    proof.adminNote = note || "";
    proof.lastVerified = new Date();
    await sub.save();

    // Update campaign for PGC: deduct flat fee and increment approvedVideosCount
    await campaign.approveVideo(1);

    // Wallet moves
    advertiserWallet.escrowLocked -= totalDeduct;
    await advertiserWallet.save();

    clipperWallet.balance += payoutClipper;
    await clipperWallet.save();

    platformWallet.balance += payoutPlatform;
    await platformWallet.save();

    // Calculate videos left for response
    const campaignVideosLeft = campaign.desiredVideos - campaign.approvedVideosCount;

    // Response includes kind + CPMs for UI
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
      campaignVideosLeft, // Use videos left for PGC
      campaignKind,
      clipperCPM: CLIPPER_CPM,
      platformCPM: PLATFORM_CPM
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Approval failed' });
  }
});
// POST /api/admin/submissions/:submissionId/proof/:proofId/verify
router.post('/:submissionId/proof/:proofId/verify', requireAdminAuth, async (req, res) => {
  try {
    const { verifiedViews, note } = req.body;
    if (!Number.isFinite(verifiedViews) || verifiedViews < 0) {
      return res.status(400).json({ error: 'Invalid view count' });
    }

    const { submissionId, proofId } = req.params;

    const sub = await ClipSubmission.findById(submissionId).populate('campaign clipper');
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const proof = sub.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found' });

    const campaign = await Campaign.findById(sub.campaign._id).populate('advertiser');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { clipper: CLIPPER_CPM, platform: PLATFORM_CPM } = getCPMsForCampaign(campaign);

    // Wallets
    const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id }) ||
      await Wallet.create({ user: campaign.advertiser._id });

    const clipperWallet = await Wallet.findOne({ user: sub.clipper._id }) ||
      await Wallet.create({ user: sub.clipper._id });

    const platformUser = await User.findOne({ role: 'platform' }) ||
      await User.create({
        role: 'platform',
        email: 'platform@clippapay.com',
        passwordHash: 'NO_LOGIN',
        company: 'ClippaPay Platform'
      });

    const platformWallet = await Wallet.findOne({ user: platformUser._id }) ||
      await Wallet.create({ user: platformUser._id });

    // VIEW DELTAS
    const lastVerified = proof.verifiedViews || 0;
    const newVerified = Number(verifiedViews);
    const deltaViews = newVerified - lastVerified;

    let payoutClipper = 0;
    let payoutPlatform = 0;
    let totalDeduct = 0;
    let viewsToDeduct = 0;
    let fixedPayoutApplied = false;

    // ------------------------------------------------------------
    // UGC LOGIC (Version-Safe)
    // ------------------------------------------------------------

    const ugcVersion = campaign.ugcVersion || 1;    // default = old behavior
    const isUGC = campaign.kind === 'ugc';
    const isNormal = campaign.kind === 'normal';
    const isOldUGC = isUGC && ugcVersion === 1;
    const isNewUGC = isUGC && ugcVersion >= 2;

    // ============================================================
    // OLD UGC → ₦2,000 per proof (original behavior) && !proof.fixedPayoutGiven
    // ============================================================
    if (isOldUGC) {

      // ensure clipper slot available
      if (campaign.clippersCount >= campaign.clipperSlots) {
        return res.status(400).json({ error: 'All UGC clipper slots already filled' });
      }

      if (newVerified > 0) {
        payoutClipper = (newVerified * CLIPPER_CPM) / 1000;
        payoutPlatform = (newVerified * PLATFORM_CPM) / 1000;
        viewsToDeduct = newVerified;
      }

      totalDeduct = payoutClipper + payoutPlatform;

      if (sub.rewardAmount === 0) {
        sub.firstPayoutGiven = true;
  
      }
    }

    // ============================================================
    // NEW UGC → ONE-TIME ₦2,000 PER CAMPAIGN
    // ============================================================
    else if (isNewUGC && !sub.firstPayoutGiven) {

      if (campaign.clippersCount >= campaign.clipperSlots) {
        return res.status(400).json({ error: 'All UGC clipper slots already filled' });
      }

      // One-time fixed payout per clipper per campaign
      payoutClipper = campaign.fixedClipperPayout;       // 2000
      payoutPlatform = campaign.platformFeePerClipper;   // 500
      fixedPayoutApplied = true;

      // also pay any initial views
      if (newVerified > 0) {
        payoutClipper += (newVerified * CLIPPER_CPM) / 1000;
        payoutPlatform += (newVerified * PLATFORM_CPM) / 1000;
        viewsToDeduct = newVerified;
      }

      totalDeduct = payoutClipper + payoutPlatform;

      // NEW BEHAVIOR: used only once per campaign per clipper
      if (sub.rewardAmount === 0) {
        sub.firstPayoutGiven = true;
      }
    }
    else if (isNewUGC && sub.firstPayoutGiven) {

      if (campaign.clippersCount >= campaign.clipperSlots) {
        return res.status(400).json({ error: 'All UGC clipper slots already filled' });
      }
      // also pay any initial views
      if (newVerified > 0) {
        payoutClipper = (newVerified * CLIPPER_CPM) / 1000;
        payoutPlatform = (newVerified * PLATFORM_CPM) / 1000;
        viewsToDeduct = newVerified;
      }

      totalDeduct = payoutClipper + payoutPlatform;

      // NEW BEHAVIOR: used only once per campaign per clipper
      if (sub.rewardAmount === 0) {
        sub.firstPayoutGiven = true;
      
      }
     
    }
    else if (isNormal) {

      if (campaign.clippersCount >= campaign.clipperSlots) {
        return res.status(400).json({ error: 'All UGC clipper slots already filled' });
      }
      // also pay any initial views
      if (newVerified > 0) {
        payoutClipper = (newVerified * CLIPPER_CPM) / 1000;
        payoutPlatform = (newVerified * PLATFORM_CPM) / 1000;
        viewsToDeduct = newVerified;
      }

      totalDeduct = payoutClipper + payoutPlatform;

      if (sub.rewardAmount === 0) {
        sub.firstPayoutGiven = true;
      }
    }
    else {
      return res.status(400).json({ error: 'No new views to approve' });
    }

    // ------------------------------------------------------------
    // ESCROW CHECK
    // ------------------------------------------------------------
    if (advertiserWallet.escrowLocked < totalDeduct) {
      return res.status(400).json({
        error: 'Insufficient escrow funds',
        required: totalDeduct,
        available: advertiserWallet.escrowLocked
      });
    }

    // ------------------------------------------------------------
    // UPDATE PROOF + SUBMISSION
    // ------------------------------------------------------------
    proof.status = 'approved';
    proof.verifiedViews = newVerified;
    proof.rewardAmount += payoutClipper;
    proof.adminNote = note || '';
    proof.lastVerified = new Date();

    sub.markModified('proofs');
    await sub.save();

    // ------------------------------------------------------------
    // UPDATE CAMPAIGN
    // ------------------------------------------------------------
    if (viewsToDeduct > 0) {
      await campaign.deductViewsAndBudget(viewsToDeduct);
    }

    // NEW UGC fixed deduction from budget
    if (fixedPayoutApplied && isNewUGC) {
      campaign.budget_remaining -=
        (campaign.fixedClipperPayout + campaign.platformFeePerClipper);
    }

    await campaign.save();

    // ------------------------------------------------------------
    // WALLET TRANSFERS
    // ------------------------------------------------------------
    advertiserWallet.escrowLocked -= totalDeduct;
    clipperWallet.balance += payoutClipper;
    platformWallet.balance += payoutPlatform;

    await Promise.all([
      advertiserWallet.save(),
      clipperWallet.save(),
      platformWallet.save()
    ]);

    // ------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------
    res.json({
      message: 'Proof verified successfully',
      fixedPayoutApplied,
      campaignKind: campaign.kind,
      ugcVersion,
      payoutClipper: payoutClipper.toFixed(2),
      payoutPlatform: payoutPlatform.toFixed(2),
      totalDeducted: totalDeduct.toFixed(2),
      viewsDeducted: viewsToDeduct,
      clipperSlots: campaign.clipperSlots,
      campaignViewsLeft: campaign.views_left,
      campaignBudgetRemaining: campaign.budget_remaining
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

// // Approve a specific proof by proof _id
// router.post('/:submissionId/proof/:proofId/verify', requireAdminAuth, async (req, res) => {
//   try {
//     const { verifiedViews, note } = req.body;
//     if (!Number.isFinite(verifiedViews) || verifiedViews < 0)
//       return res.status(400).json({ error: 'Invalid view count' });

//     const { submissionId, proofId } = req.params;

//     const sub = await ClipSubmission.findById(submissionId).populate('campaign clipper');
//     if (!sub) return res.status(404).json({ error: 'Submission not found' });

//     const proof = sub.proofs.id(proofId);
//     if (!proof) return res.status(404).json({ error: 'Proof not found' });

//     const lastVerified = proof.verifiedViews || 0;
//     const newVerified = Number(verifiedViews);
//     if (newVerified < lastVerified)
//       return res.status(400).json({ error: "Submitted view count can't be less than last approved" });

//     const deltaViews = newVerified - lastVerified;
//     if (deltaViews <= 0)
//       return res.status(400).json({ error: "No new views to approve" });

//     const campaign = await Campaign.findById(sub.campaign._id).populate('advertiser');
//     if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

//     // >>> Use kind-aware CPMs
//     const { kind: campaignKind, clipper: CLIPPER_CPM, platform: PLATFORM_CPM } = getCPMsForCampaign(campaign);

//     let advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id }) ||
//       await Wallet.create({ user: campaign.advertiser._id, balance: 0, escrowLocked: 0 });

//     let clipperWallet = await Wallet.findOne({ user: sub.clipper._id }) ||
//       await Wallet.create({ user: sub.clipper._id, balance: 0, escrowLocked: 0 });

//     let platformUser = await User.findOne({ role: 'platform' }) ||
//       await User.create({ role: 'platform', email: 'platform@clippapay.com', passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN', isSuperAdmin: false, company: 'ClippaPay Platform' });

//     let platformWallet = await Wallet.findOne({ user: platformUser._id }) ||
//       await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

//     // Calculate payouts for deltaViews using kind-aware CPMs
//     const payoutClipper = (deltaViews * CLIPPER_CPM) / 1000;
//     const payoutPlatform = (deltaViews * PLATFORM_CPM) / 1000;
//     const totalDeduct = payoutClipper + payoutPlatform;

//     if (advertiserWallet.escrowLocked < totalDeduct)
//       return res.status(400).json({ error: 'Insufficient escrow balance' });

//     // Update proof
//     proof.status = 'approved';
//     proof.verifiedViews = newVerified;
//     proof.rewardAmount = (proof.rewardAmount || 0) + payoutClipper;
//     proof.adminNote = note || "";
//     proof.lastVerified = new Date();
//     await sub.save();

//     // Update campaign/budgets
//     await campaign.deductViewsAndBudget(deltaViews);

//     // Wallet moves
//     advertiserWallet.escrowLocked -= totalDeduct;
//     await advertiserWallet.save();

//     clipperWallet.balance += payoutClipper;
//     await clipperWallet.save();

//     platformWallet.balance += payoutPlatform;
//     await platformWallet.save();

//     // <<< Include kind + CPMs so the UI can show UGC math
//     res.json({
//       submissionId: sub._id,
//       proofId: proof._id,
//       clipperName: sub.clipper.name || sub.clipper.email,
//       campaignTitle: campaign.title,
//       platform: proof.platform,
//       proofUrl: proof.proofVideo || proof.proofImage || proof.submissionUrl,
//       reportedViews: proof.views,
//       verifiedViews: proof.verifiedViews,
//       status: proof.status,
//       rewardAmount: proof.rewardAmount,
//       adminNote: proof.adminNote,
//       campaignStatus: campaign.status,
//       campaignViewsLeft: campaign.views_left,

//       // NEW FIELDS:
//       campaignKind,
//       clipperCPM: CLIPPER_CPM,
//       platformCPM: PLATFORM_CPM
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Verification failed' });
//   }
// });


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


// routes/adminSubmissions.js (add this new route)

/**
 * GET approved submissions for a specific clipper
 * Query params:
 * - clipper: user ID of the clipper
 * - status: filter by status (approved/pending/rejected)
 */
// In your AdminCorrectApproval.tsx component


// In express_backend/routes/adminSubmissions.js
// Remove the TypeScript type annotations for JavaScript files

// Helper to find user by email
router.get('/find-user', requireAdminAuth, async (req, res) => {
  
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email })
      .select('_id email firstName lastName')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format name
    user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided';
    
    res.json(user);
  } catch (err) {
    console.error('Failed to find user:', err);
    res.status(500).json({ error: 'Failed to find user' });
  }
});

// Get submissions for user
router.get('/user-submissions', requireAdminAuth, async (req, res) => {
  
  try {
    const { userId, status } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const query = { clipper: userId };
    if (status) {
      query['proofs.status'] = status;
    }

    const submissions = await ClipSubmission.find(query)
      .populate([
        { path: 'clipper', select: 'email firstName lastName' },
        { path: 'campaign', select: 'title advertiser metrics' }
      ])
      .sort({ createdAt: -1 })
      .lean();

    if (!submissions.length) {
      return res.status(404).json({ error: 'No submissions found' });
    }

    const formatted = submissions.map(formatSubmission);
    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Helper function to format submission
function formatSubmission(sub) {
  return {
    _id: sub._id,
    campaign: sub.campaign ? {
      _id: sub.campaign._id,
      title: sub.campaign.title || 'Deleted Campaign',
      advertiser: sub.campaign.advertiser,
      metrics: sub.campaign.metrics || {}
    } : {
      _id: 'deleted',
      title: 'Deleted Campaign',
      advertiser: null,
      metrics: {}
    },
    clipper: sub.clipper ? {
      _id: sub.clipper._id,
      email: sub.clipper.email,
      name: `${sub.clipper.firstName || ''} ${sub.clipper.lastName || ''}`.trim() || sub.clipper.email
    } : {
      _id: 'deleted',
      email: 'deleted@user.com',
      name: 'Deleted User'
    },
    proofs: (sub.proofs || []).map(p => ({
      _id: p._id,
      platform: p.platform,
      submissionUrl: p.submissionUrl,
      proofVideo: p.proofVideo,
      proofImage: p.proofImage,
      views: p.views || 0,
      verifiedViews: p.verifiedViews || 0,
      status: p.status || 'pending',
      rewardAmount: p.rewardAmount || 0,
      adminNote: p.adminNote || '',
      lastVerified: p.lastVerified || new Date(),
      createdAt: p.createdAt || new Date()
    }))
  };
}
// Add this new route to handle correction of wrong approvals (normal + UGC)
router.post('/correct-approval', requireAdminAuth, async (req, res) => {
  try {
    const { submissionId, proofId, correctViews } = req.body;

    const submission = await ClipSubmission.findById(submissionId)
      .populate('campaign clipper');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const incorrectProof = submission.proofs.id(proofId);
    if (!incorrectProof || incorrectProof.status !== 'approved') {
      return res.status(400).json({ error: 'Approved proof not found' });
    }

    const campaign = await Campaign.findById(submission.campaign._id).populate('advertiser');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // --- Resolve CPMs in a kind-aware way (normal vs UGC) ---
    // Prefer your existing helper if available.
    let CLIPPER_CPM, PLATFORM_CPM, campaignKind;
    try {
      if (typeof getCPMsForCampaign === 'function') {
        const { kind, clipper, platform } = getCPMsForCampaign(campaign);
        campaignKind = kind;
        CLIPPER_CPM = clipper;
        PLATFORM_CPM = platform;
      }
    } catch (_) {}

    // Fallbacks if helper not present:
    if (!CLIPPER_CPM || !PLATFORM_CPM) {
      campaignKind = campaignKind || campaign.kind || 'normal';
      // Use stored CPMs when present
      const storedClipper = Number(campaign.clipper_cpm);
      // If you store platform CPM separately, use it; else derive a default
      const storedPlatform = Number(campaign.platform_cpm);

      if (campaignKind === 'ugc') {
        CLIPPER_CPM = Number.isFinite(storedClipper) && storedClipper > 0 ? storedClipper : 2000;
        PLATFORM_CPM = Number.isFinite(storedPlatform) && storedPlatform > 0 ? storedPlatform : 3000;
      } else {
        CLIPPER_CPM = Number.isFinite(storedClipper) && storedClipper > 0 ? storedClipper : 500;
        PLATFORM_CPM = Number.isFinite(storedPlatform) && storedPlatform > 0 ? storedPlatform : 700;
      }
    }

    // --- Wallets ---
    let advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id }) ||
      await Wallet.create({ user: campaign.advertiser._id, balance: 0, escrowLocked: 0 });

    let clipperWallet = await Wallet.findOne({ user: submission.clipper._id }) ||
      await Wallet.create({ user: submission.clipper._id, balance: 0, escrowLocked: 0 });

    let platformUser = await User.findOne({ role: 'platform' }) ||
      await User.create({
        role: 'platform',
        email: 'platform@clippapay.com',
        passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN',
        isSuperAdmin: false,
        company: 'ClippaPay Platform'
      });

    let platformWallet = await Wallet.findOne({ user: platformUser._id }) ||
      await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

    // --- Reverse the previous approval ---
    const incorrectViews = incorrectProof.verifiedViews || 0;

    // NOTE: rewardAmount on the proof is the clipper payout previously paid
    const incorrectClipperAmount = incorrectProof.rewardAmount || 0;
    // Recompute platform share using PLATFORM_CPM (kind-aware)
    const incorrectPlatformAmount = (incorrectViews * PLATFORM_CPM) / 1000;
    const totalToReverse = incorrectClipperAmount + incorrectPlatformAmount;

    if (clipperWallet.balance < incorrectClipperAmount) {
      return res.status(400).json({
        error: `Clipper wallet has insufficient balance (${clipperWallet.balance} available, need ${incorrectClipperAmount})`
      });
    }
    if (platformWallet.balance < incorrectPlatformAmount) {
      return res.status(400).json({
        error: `Platform wallet has insufficient balance (${platformWallet.balance} available, need ${incorrectPlatformAmount})`
      });
    }

    // 1) Reverse previous payment
    clipperWallet.balance -= incorrectClipperAmount;
    platformWallet.balance -= incorrectPlatformAmount;
    advertiserWallet.escrowLocked += totalToReverse;

    // 2) Add views and budget back to campaign
    await campaign.restoreViewsAndBudget(incorrectViews);
    await Promise.all([
      clipperWallet.save(),
      platformWallet.save(),
      advertiserWallet.save()
    ]);

    // 3) Update the old proof to rejected (keeps an audit trail)
    incorrectProof.status = 'rejected';
    incorrectProof.adminNote = `Corrected - originally approved in error for ${incorrectViews} views`;
    incorrectProof.rewardAmount = 0;

    let newProof = null;

    // --- If we have a correct view count, re-approve with correct CPMs ---
    if (Number.isFinite(correctViews) && correctViews > 0) {
      const correctClipperAmount = (correctViews * CLIPPER_CPM) / 1000;
      const correctPlatformAmount = (correctViews * PLATFORM_CPM) / 1000;
      const correctTotal = correctClipperAmount + correctPlatformAmount;

      if (advertiserWallet.escrowLocked < correctTotal) {
        return res.status(400).json({
          error: `Advertiser has insufficient escrow (${advertiserWallet.escrowLocked} available, need ${correctTotal})`
        });
      }

      newProof = {
        platform: incorrectProof.platform,
        submissionUrl: incorrectProof.submissionUrl,
        views: correctViews,
        proofVideo: incorrectProof.proofVideo,
        proofImage: incorrectProof.proofImage,
        status: 'approved',
        verifiedViews: correctViews,
        rewardAmount: correctClipperAmount, // clipper's share
        adminNote: 'Corrected approval',
        lastVerified: new Date()
      };

      submission.proofs.push(newProof);

      advertiserWallet.escrowLocked -= correctTotal;
      clipperWallet.balance += correctClipperAmount;
      platformWallet.balance += correctPlatformAmount;

      await Promise.all([
        advertiserWallet.save(),
        clipperWallet.save(),
        platformWallet.save()
      ]);

      await campaign.deductViewsAndBudget(correctViews);
    }

    await submission.save();

    res.json({
      message: 'Correction completed successfully',
      campaignKind,
      cpmsUsed: { clipperCPM: CLIPPER_CPM, platformCPM: PLATFORM_CPM },
      correctionsMade: {
        reversedClipperAmount: incorrectClipperAmount,
        reversedPlatformAmount: incorrectPlatformAmount,
        viewsRestored: incorrectViews,
        newApproval: newProof ? {
          views: newProof.verifiedViews,
          rewardAmount: newProof.rewardAmount
        } : null,
        submissionId: submission._id,
        proofId: incorrectProof._id
      }
    });

  } catch (err) {
    console.error('Error correcting approval:', err);
    res.status(500).json({ error: 'Failed to correct approval', details: err.message });
  }
});


export default router;