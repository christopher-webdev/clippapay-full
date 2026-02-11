// routes/clippers.js
import express from 'express';
import ClipSubmission from '../models/ClipSubmission.js';
import Campaign from '../models/Campaign.js';
import {
  requireAuth,
  requireClipper,
  requireAdmin,
  
} from '../middleware/auth.js';
import Clip from '../models/Clip.js';
import fs from 'fs';


import multer from 'multer';
import path from 'path';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';


const router = express.Router();

// const videoUpload = multer({ storage: videoStorage });
// --- Multer config for proof video uploads ---
const proofDir = path.join(process.cwd(), 'uploads/proofs');
fs.mkdirSync(proofDir, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, proofDir),
  filename:   (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const uniq = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, uniq + ext);
  }
});
const uploadProof = multer({ storage: proofStorage });
const getRelPath = f => f ? `/uploads/proofs/${path.basename(f.path)}` : undefined;

router.post('/:id/submit-clip', requireAuth, uploadProof.any(), async (req, res) => {
  try {
    const { submissionUrl, views, platform } = req.body;
    const clipper = req.user._id;
    const campaignId = req.params.id;

    const proofVideoFile = req.files?.find(f => f.fieldname === 'proofVideo');
    const proofImageFile = req.files?.find(f => f.fieldname === 'proofImage');
    const proofVideo = proofVideoFile ? getRelPath(proofVideoFile) : null;
    const proofImage = proofImageFile ? getRelPath(proofImageFile) : null;
    const viewsNum = Number(views) || 0;

    // 1. Fetch campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    const isPgc = campaign.kind === 'pgc';
    const isUgcOrNormal = ['ugc', 'normal'].includes(campaign.kind);

    let submission = await ClipSubmission.findOne({ campaign: campaignId, clipper });
    let isNewClipper = !submission;

    if (!submission) {
      submission = new ClipSubmission({
        campaign: campaignId,
        clipper,
        proofs: []
      });
    }

    // ———————— PGC CAMPAIGN LOGIC ————————
    if (isPgc) {
      // PGC: Only one proof allowed (usually), video required
      if (!proofVideo) {
        return res.status(400).json({ error: 'Video proof is required for PGC campaigns.' });
      }

      // Optional: Prevent multiple submissions
      if (submission.proofs.length > 0) {
        return res.status(409).json({ error: 'You have already submitted a video for this PGC campaign.' });
      }

      submission.proofs = []; // Clear old if any (safety)
      submission.proofs.push({
        platform: 'Video', // or null
        submissionUrl: null,
        views: 0,
        proofVideo,
        proofImage,
        status: 'pending',
        adminNote: null,
        verifiedViews: 0,
        rewardAmount: 0
      });

      await submission.save();

      if (isNewClipper) {
        await Campaign.findByIdAndUpdate(campaignId, { $inc: { clippersCount: 1 } });
      }

      return res.status(201).json({ message: 'PGC video submitted successfully!', submission });
    }

    // ———————— UGC & NORMAL CAMPAIGN LOGIC ————————
    if (!isUgcOrNormal) {
      return res.status(400).json({ error: 'Invalid campaign type.' });
    }

    // Platform is required for UGC/Normal
    if (!platform) return res.status(400).json({ error: 'Platform is required.' });

    const platformLower = platform.trim().toLowerCase();
    const allowedPlatforms = (campaign.platforms || []).map(p => p.toLowerCase());
    const isAllowed = allowedPlatforms.includes(platformLower) || allowedPlatforms.length === 0;

    if (!isAllowed) {
      return res.status(400).json({ 
        error: `Platform "${platform.trim()}" is not allowed.` 
      });
    }

    const isWhatsApp = platformLower === 'whatsapp';

    // WhatsApp rules
    if (isWhatsApp) {
      if (submissionUrl) {
        return res.status(400).json({ error: 'WhatsApp submissions cannot include a link.' });
      }
      if (!proofVideo && !proofImage) {
        return res.status(400).json({ error: 'WhatsApp requires screenshot or video proof.' });
      }
    } else {
      // Non-WhatsApp: link required
      if (!submissionUrl?.trim()) {
        return res.status(400).json({ error: 'Post link is required.' });
      }
      if (!/^https:\/\//i.test(submissionUrl.trim())) {
        return res.status(400).json({ error: 'Link must start with https://' });
      }

      // Duplicate link check
      const existingLink = await ClipSubmission.findOne({
        campaign: campaignId,
        'proofs.submissionUrl': submissionUrl.trim(),
        'proofs.platform': { $ne: 'WhatsApp' }
      });
      if (existingLink) {
        return res.status(409).json({ error: 'This link was already submitted by another clipper.' });
      }
    }

    // Prevent same platform twice
    const alreadyHasPlatform = submission.proofs.some(
      p => p.platform?.toLowerCase() === platformLower
    );
    if (alreadyHasPlatform) {
      return res.status(409).json({ 
        error: `You already submitted for ${platform.trim()}. Use "Update" instead.` 
      });
    }

    // Push new proof
    submission.proofs.push({
      platform: platform.trim(),
      submissionUrl: isWhatsApp ? null : submissionUrl.trim(),
      views: viewsNum,
      proofVideo,
      proofImage,
      status: 'pending',
      adminNote: null,
      verifiedViews: 0,
      rewardAmount: 0
    });

    await submission.save();

    if (isNewClipper) {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { clippersCount: 1 } });
    }

    return res.status(201).json({ message: 'Proof submitted!', submission });

  } catch (err) {
    console.error('Submit clip error:', err);
    return res.status(500).json({ error: 'Submission failed.' });
  }
});
router.get(
  '/available-pgc',
  requireAuth,
  requireClipper,
  async (req, res) => {
    try {
      const availableCampaigns = await Campaign.find({
        kind: 'pgc',
        status: 'active',
        $expr: { $lt: ['$approvedVideosCount', '$desiredVideos'] }, // still has open slots
      })
        .select(
          '_id title brief deliverables assets approvalCriteria ' +
          'pgcAddons script budget_total clipper_cpm ' +
          'desiredVideos approvedVideosCount clippersCount ' +
          'status createdAt advertiser ' +
          // Additional fields clippers need to see:
          'directions hashtags categories captionTemplate ' +
          'cta_url usageRights'
        )
        .populate('advertiser', 'company contactName email') // Optional: brand/company info
        .sort({ createdAt: -1 }) // Newest first
        .limit(50); // Prevent overload – adjust as needed

      // Optional: enrich with application status for current clipper
      // (uncomment if you already have Application model)
      /*
      const clipperId = req.user._id;
      const applications = await Application.find({
        clipper: clipperId,
        campaign: { $in: availableCampaigns.map(c => c._id) }
      }).select('campaign status');

      const appliedMap = new Map(
        applications.map(app => [app.campaign.toString(), app.status])
      );

      const enriched = availableCampaigns.map(campaign => {
        const campaignIdStr = campaign._id.toString();
        return {
          ...campaign.toObject(),
          myApplicationStatus: appliedMap.get(campaignIdStr) || null, // null | 'pending' | 'approved' | 'rejected'
        };
      });

      return res.status(200).json(enriched);
      */

      // Return raw campaigns (without application status yet)
      res.status(200).json(availableCampaigns);

    } catch (error) {
      console.error('Error fetching available PGC campaigns:', error);
      res.status(500).json({
        error: 'Failed to fetch available PGC campaigns',
        message: error.message,
      });
    }
  }
);

// Generic join route — works for normal, ugc, pgc
router.post('/:id/join', requireAuth, requireClipper, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const clipper = req.user._id;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'active') return res.status(403).json({ error: 'Campaign not active' });

    let submission = await ClipSubmission.findOne({ campaign: campaignId, clipper });
    if (!submission) {
      submission = await ClipSubmission.create({
        campaign: campaignId,
        clipper,
        proofs: []
      });
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { clippersCount: 1 } });
    }

    res.json({ submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not join campaign' });
  }
});

// POST /api/clippers/pgc/:id/submit-video - Clipper submits a video for PGC
router.post('/pgc/:id/submit-video', requireAuth, requireClipper, uploadProof.single('video'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || campaign.kind !== 'pgc') return res.status(404).json({ error: 'PGC campaign not found' });
    if (!campaign.canClipperJoin()) return res.status(400).json({ error: 'Campaign is full' });

    const clipper = req.user._id;
    const url = `/uploads/videos/${req.file.filename}`;

    // Check if clipper already submitted (limit to 1 per clipper? Adjust as needed)
    const existing = await Clip.findOne({ campaign: campaign._id, adWorker: clipper });
    if (existing) return res.status(400).json({ error: 'You already submitted a video' });

    const clip = new Clip({
      campaign: campaign._id,
      adWorker: clipper,  // Clipper
      url,
      status: 'pending'
    });
    await clip.save();

    // Increment clippersCount if new
    if (!existing) await campaign.incrementClippers();

    res.status(201).json(clip);
  } catch (err) {
    console.error('PGC submit-video error:', err);
    res.status(500).json({ error: 'Failed to submit video' });
  }
});

// PATCH /clippers/:id/update-proof-pgc/:proofId
router.patch('/:id/update-proof-pgc/:proofId', requireAuth, uploadProof.any(), async (req, res) => {
  try {
    const { id, proofId } = req.params;
    const proofVideo = getRelPath(req.files?.find(f => f.fieldname === 'proofVideo'));
    const proofImage = getRelPath(req.files?.find(f => f.fieldname === 'proofImage'));

    const submission = await ClipSubmission.findById(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    const proof = submission.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found.' });

    // For PGC, proofVideo is required
    if (!proofVideo) {
      return res.status(400).json({ error: 'Video proof required.' });
    }

    // Update fields
    proof.proofVideo = proofVideo;
    if (proofImage) proof.proofImage = proofImage;
    proof.status = 'pending'; // re-verification on update

    await submission.save();
    res.json(submission);
  } catch (err) {
    console.error('Error in /update-proof-pgc:', err);
    res.status(500).json({ error: 'Could not update proof.' });
  }
});

router.patch('/:id/update-proof/:proofId', requireAuth, uploadProof.any(), async (req, res) => {
  try {
    const { views, submissionUrl } = req.body; // Added submissionUrl to destructured body
    const { id, proofId } = req.params;
    const proofVideo = getRelPath(req.files?.find(f => f.fieldname === 'proofVideo'));
    const proofImage = getRelPath(req.files?.find(f => f.fieldname === 'proofImage'));

    const submission = await ClipSubmission.findById(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    const proof = submission.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found.' });

    if (!views) return res.status(400).json({ error: 'Views required.' });

    // For platforms that require proof, at least one file is required
    if ((proof.platform === 'TikTok' || proof.platform === 'Facebook') && !proofVideo && !proofImage) {
      return res.status(400).json({ error: 'Video or image proof required.' });
    }

    // Validate and update submissionUrl if provided
    if (submissionUrl) {
      const HTTPS_ONLY_REGEX = /^https:\/\/.+/i;
      if (!HTTPS_ONLY_REGEX.test(submissionUrl)) {
        return res.status(400).json({ error: 'Submission URL must start with "https://".' });
      }
      proof.submissionUrl = submissionUrl; // Update submissionUrl
    }

    proof.views = Number(views) || proof.views;
    if (proofVideo) proof.proofVideo = proofVideo;
    if (proofImage) proof.proofImage = proofImage;
    proof.status = 'pending'; // re-verification on update

    await submission.save();
    res.json(submission);
  } catch (err) {
    console.error('Error in /update-proof:', err);
    res.status(500).json({ error: 'Could not update proof.' });
  }
});

/**
 * GET /api/clippers/my-submissions
 * List all submissions for this user
 */
// GET /api/clippers/my-submissions
router.get('/my-submissions', requireAuth, async (req, res) => {
  try {
    // populate the bare minimum we need for the UI progress + status
    const subs = await ClipSubmission.find({ clipper: req.user._id })
      .populate('campaign', 'title status views_left views_purchased updatedAt') // ▲ add fields
      .sort({ createdAt: -1 })
      .lean();

    // Flatten essential campaign fields so the UI can render even if campaign is missing
    const formatted = subs.map(s => {
      const camp = s.campaign && typeof s.campaign === 'object' ? s.campaign : null;

      // If the campaign was deleted or not populated, treat as completed/closed
      const fallbackStatus = 'completed';
      const fallbackLeft   = 0;
      const fallbackTotal  = (typeof s?.campaignViewsPurchased === 'number') ? s.campaignViewsPurchased : undefined;

      return {
        ...s,
        // keep original populated campaign (may be null)
        campaign: camp ? { _id: camp._id, title: camp.title } : s.campaign,

        // explicit fallbacks the UI already supports
        campaignStatus: camp?.status ?? fallbackStatus,
        campaignViewsLeft: (typeof camp?.views_left === 'number') ? camp.views_left : fallbackLeft,
        campaignViewsPurchased: (typeof camp?.views_purchased === 'number')
          ? camp.views_purchased
          : (typeof fallbackTotal === 'number' ? fallbackTotal : undefined),

        // Optionally expose updatedAt so you can show “updated …”
        campaignUpdatedAt: camp?.updatedAt
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('my-submissions error:', err);
    res.status(500).json({ error: 'Could not fetch submissions.' });
  }
});

/**
 * GET /api/clippers/overview
 * Dashboard stats for logged-in clipper
 */
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Campaigns joined = campaigns with at least one submission by this clipper
    const joinedCampaigns = await ClipSubmission.distinct('campaign', { clipper: userId }).then(arr => arr.length);

    // Active = campaigns that are still open (campaign status active)
    const activeCampaigns = await Campaign.countDocuments({
      _id: { $in: await ClipSubmission.distinct('campaign', { clipper: userId }) },
      status: 'active'
    });

    // Total submissions (all platforms, all time)
    const submissions = await ClipSubmission.countDocuments({ clipper: userId });

    // Pending verifications = proofs still waiting approval
    const pendingVerifications = await ClipSubmission.aggregate([
      { $match: { clipper: userId } },
      { $unwind: "$proofs" },
      { $match: { "proofs.status": "pending" } },
      { $count: "count" }
    ]).then(res => res[0]?.count || 0);

    // Total earned = sum of all approved proofs' rewardAmount
    const result = await ClipSubmission.aggregate([
      { $match: { clipper: userId } },
      { $unwind: "$proofs" },
      { $match: { "proofs.status": "approved" } },
      { $group: { _id: null, total: { $sum: "$proofs.rewardAmount" } } }
    ]);
    const totalEarned = result.length > 0 ? result[0].total : 0;

    // Wallet balance
    let walletBalance = 0;
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) walletBalance = wallet.balance;

    return res.json({
      joinedCampaigns,
      submissions,
      pendingVerifications,
      activeCampaigns,
      walletBalance,
      totalEarned,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch overview.' });
  }
});


// GET /api/clippers/my-ugc-submissions
router.get('/my-ugc-submissions', requireAuth, async (req, res) => {
  try {
    // Fetch submissions for the authenticated clipper, excluding PGC campaigns
    const subs = await ClipSubmission.find({ clipper: req.user._id })
      .populate({
        path: 'campaign',
        select: 'title status views_left views_purchased updatedAt kind',
        match: { kind: { $in: ['normal', 'ugc'] } } // Exclude PGC
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out submissions where campaign is null (due to non-matching kind)
    const validSubs = subs.filter(s => s.campaign !== null);

    // Format submissions for UI compatibility
    const formatted = validSubs.map(s => {
      const camp = s.campaign && typeof s.campaign === 'object' ? s.campaign : null;

      // Fallbacks for robustness
      const fallbackStatus = 'completed';
      const fallbackLeft = 0;
      const fallbackTotal = typeof s?.campaignViewsPurchased === 'number' ? s.campaignViewsPurchased : undefined;

      return {
        ...s,
        campaign: camp ? { _id: camp._id, title: camp.title, kind: camp.kind } : s.campaign,
        campaignStatus: camp?.status ?? fallbackStatus,
        campaignViewsLeft: typeof camp?.views_left === 'number' ? camp.views_left : fallbackLeft,
        campaignViewsPurchased: typeof camp?.views_purchased === 'number'
          ? camp.views_purchased
          : fallbackTotal,
        campaignUpdatedAt: camp?.updatedAt
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('my-ugc-submissions error:', err);
    res.status(500).json({ error: 'Could not fetch UGC submissions.' });
  }
});

// GET /api/clippers/my-pgc-submissions
router.get('/my-pgc-submissions', requireAuth, async (req, res) => {
  try {
    // Fetch submissions for the authenticated clipper, only for PGC campaigns
    const subs = await ClipSubmission.find({ clipper: req.user._id })
      .populate({
        path: 'campaign',
        select: 'title status desiredVideos approvedVideosCount updatedAt kind',
        match: { kind: 'pgc' } // Only PGC
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out submissions where campaign is null (due to non-matching kind)
    const validSubs = subs.filter(s => s.campaign !== null);

    // Format submissions for UI compatibility
    const formatted = validSubs.map(s => {
      const camp = s.campaign && typeof s.campaign === 'object' ? s.campaign : null;

      // Fallbacks for robustness
      const fallbackStatus = 'completed';
      const fallbackDesired = 1;
      const fallbackApproved = 0;

      return {
        ...s,
        campaign: camp ? { _id: camp._id, title: camp.title, kind: camp.kind } : s.campaign,
        campaignStatus: camp?.status ?? fallbackStatus,
        campaignDesiredVideos: typeof camp?.desiredVideos === 'number' ? camp.desiredVideos : fallbackDesired,
        campaignApprovedVideosCount: typeof camp?.approvedVideosCount === 'number' ? camp.approvedVideosCount : fallbackApproved,
        campaignUpdatedAt: camp?.updatedAt
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('my-pgc-submissions error:', err);
    res.status(500).json({ error: 'Could not fetch PGC submissions.' });
  }
});

router.get('/available', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const campaigns = await Campaign.find({
      status: 'active',
      adWorkerStatus: 'ready',
      // $or: [  // Commented out for troubleshooting - this ignores progress filters
      //   // Non-PGC: > 50% views remaining
      //   {
      //     kind: { $ne: 'pgc' },
      //     $expr: { $gt: ['$views_left', { $multiply: ['$views_purchased', 0.5] }] }
      //   },
      //   // Non-PGC: <= 50% views remaining but updated within last 24h
      //   {
      //     kind: { $ne: 'pgc' },
      //     $and: [
      //       { $expr: { $lte: ['$views_left', { $multiply: ['$views_purchased', 0.5] }] } },
      //       { updatedAt: { $gte: twentyFourHoursAgo } }
      //     ]
      //   },
      //   // PGC: approvedVideosCount < desiredVideos
      //   {
      //     kind: 'pgc',
      //     $expr: { $lt: ['$approvedVideosCount', '$desiredVideos'] }
      //   }
      // ]
    })
      // Put PGC and UGC first, then newest
      .sort({ kind: -1, updatedAt: -1 })
      .select(
        '_id title thumb_url rate_per_1000 clipper_cpm payPerView budget_total budget_remaining views_purchased views_left desiredVideos approvedVideosCount categories hashtags status adWorkerStatus kind createdAt updatedAt'
      )
      .lean();

    res.json(campaigns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch available campaigns.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'contactName email')
      .lean(); // Return plain object so we can shape output easily

    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    // Only show to clippers if campaign is active & ready
    if (campaign.status !== 'active' || campaign.adWorkerStatus !== 'ready') {
      return res.status(403).json({ error: 'Campaign not available.' });
    }

    const clips = await Clip.find({ campaign: campaign._id })
      .sort('index')
      .select('_id url index createdAt')
      .lean();

    // Shape the response the UI expects, plus UGC/PGC when present
    res.json({
      id: campaign._id.toString(),
      title: campaign.title,
      advertiser: campaign.advertiser?.contactName || 'Advertiser',
      description: campaign.description || '',
      thumbUrl: campaign.thumb_url,
      payPerView: campaign.clipper_cpm ?? 500, // Match frontend fallback
      totalViews: campaign.views_purchased,
      views_left: campaign.views_left,
      clippersCount: campaign.clippersCount,
      platforms: campaign.platforms,
      directions: campaign.directions, // Keep exposing top-level if used elsewhere
      hashtags: campaign.hashtags,
      status: campaign.status,
      kind: campaign.kind,
      desiredVideos: campaign.desiredVideos ?? 0, // PGC-specific
      approvedVideosCount: campaign.approvedVideosCount ?? 0, // PGC-specific
      ugc: (campaign.kind === 'ugc' || campaign.kind === 'pgc') ? {
        assets: campaign.ugc?.assets || [],
        brief: campaign.ugc?.brief || '',
        directions: (campaign.ugc?.directions && campaign.ugc.directions.length > 0)
          ? campaign.ugc.directions
          : (campaign.directions || []),
        deliverables: campaign.ugc?.deliverables || [],
        captionTemplate: campaign.ugc?.captionTemplate || '',
        usageRights: campaign.ugc?.usageRights || '',
        ...(campaign.kind === 'pgc' && {
          approvalCriteria: campaign.ugc?.approvalCriteria || '',
          draftRequired: campaign.ugc?.draftRequired ?? false,
          creativeDeadline: campaign.ugc?.creativeDeadline || '',
          postDeadline: campaign.ugc?.postDeadline || ''
        })
      } : undefined,
      clips: clips.map(c => ({
        id: c._id.toString(),
        url: c.url,
        index: c.index,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch campaign details.' });
  }
});
// ========================= UGC (Clipper) ROUTES ==============================

/**
 * GET /api/clippers/ugc/available
 * List ACTIVE UGC campaigns a clipper can work on.
 */
router.get('/ugc/available', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const campaigns = await Campaign.find({
      kind: 'ugc',
      status: 'active',
      adWorkerStatus: 'ready',
      views_left: { $gt: 0 },
      $or: [
        { $expr: { $gt: ['$views_left', { $multiply: ['$views_purchased', 0.5] } ] } },
        {
          $and: [
            { $expr: { $lte: ['$views_left', { $multiply: ['$views_purchased', 0.5] } ] } },
            { updatedAt: { $gte: twentyFourHoursAgo } }
          ]
        }
      ]
    })
    .sort({ updatedAt: -1 })
    .select(
      '_id title thumb_url rate_per_1000 clipper_cpm budget_total budget_remaining views_purchased views_left categories hashtags status adWorkerStatus createdAt updatedAt ugc'
    );

    res.json(campaigns);
  } catch (err) {
    console.error('UGC available error:', err);
    res.status(500).json({ error: 'Could not fetch available UGC campaigns.' });
  }
});


/**
 * GET /api/clippers/ugc/:id
 * Details page for a single UGC campaign (clipper-facing).
 */
router.get('/ugc/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'contactName email');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign.' });

    // Only show to clippers if campaign is active & ready
    if (campaign.status !== 'active' || campaign.adWorkerStatus !== 'ready') {
      return res.status(403).json({ error: 'Campaign not available.' });
    }

    res.json({
      id: campaign._id,
      kind: campaign.kind,
      title: campaign.title,
      advertiser: campaign.advertiser?.contactName || 'Advertiser',
      brief: campaign.ugc?.brief || '',
      deliverables: campaign.ugc?.deliverables || [],
      assets: campaign.ugc?.assets || [],
      captionTemplate: campaign.ugc?.captionTemplate || '',
      usageRights: campaign.ugc?.usageRights || '',
      creativeDeadline: campaign.ugc?.creativeDeadline,
      postDeadline: campaign.ugc?.postDeadline,

      thumbUrl: campaign.thumb_url,
      payPerView: (campaign.clipper_cpm || 0) / 1000, // e.g. 2000/k => 2 per view
      advertiserCostPerView: (campaign.rate_per_1000 || 0) / 1000, // e.g. 5 per view
      totalViews: campaign.views_purchased,
      clippersCount: campaign.clippersCount,
      platforms: campaign.platforms,
      instructions: campaign.directions,
      hashtags: campaign.hashtags,
      status: campaign.status
    });
  } catch (err) {
    console.error('UGC details error:', err);
    res.status(500).json({ error: 'Could not fetch UGC campaign details.' });
  }
});


/**
 * POST /api/clippers/ugc/:campaignId/join
 * Create (or get) a submission doc so clipper is attached to the job.
 */
router.post('/ugc/:campaignId/join', requireAuth, requireClipper, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const clipper = req.user._id;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign.' });
    if (campaign.status !== 'active' || campaign.adWorkerStatus !== 'ready') {
      return res.status(403).json({ error: 'Campaign not available.' });
    }

    let submission = await ClipSubmission.findOne({ campaign: campaign._id, clipper });
    let created = false;

    if (!submission) {
      submission = await ClipSubmission.create({ campaign: campaign._id, clipper, proofs: [] });
      created = true;
      await Campaign.findByIdAndUpdate(campaign._id, { $inc: { clippersCount: 1 } });
    }

    res.status(created ? 201 : 200).json({ submission });
  } catch (err) {
    console.error('UGC join error:', err);
    res.status(500).json({ error: 'Could not join UGC campaign.' });
  }
});


/**
 * POST /api/clippers/ugc/:id/submit-proof
 * Submit a posted UGC proof (separate path, same storage rules).
 * Body: { submissionUrl, platform, views }
 * Files (optional): proofVideo, proofImage
 */
router.post('/ugc/:id/submit-proof', requireAuth, requireClipper, uploadProof.any(), async (req, res) => {
  try {
    const { submissionUrl, views } = req.body;
    const platform = req.body.platform;
    const clipper = req.user._id;
    const campaignId = req.params.id;

    const proofVideo = getRelPath(req.files?.find(f => f.fieldname === 'proofVideo'));
    const proofImage = getRelPath(req.files?.find(f => f.fieldname === 'proofImage'));
    const viewsNum = Number(views) || 0;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign.' });
    if (campaign.status !== 'active' || campaign.adWorkerStatus !== 'ready') {
      return res.status(403).json({ error: 'Campaign not available.' });
    }

    // Global duplicate prevention
    if (submissionUrl) {
      const existingProof = await ClipSubmission.findOne({ 'proofs.submissionUrl': submissionUrl });
      if (existingProof) {
        return res.status(409).json({ error: 'This proof link has already been submitted by another clipper.' });
      }
    }

    let isNewClipper = false;
    let submission = await ClipSubmission.findOne({ campaign: campaignId, clipper });

    if (!submission) {
      isNewClipper = true;
      submission = new ClipSubmission({ campaign: campaignId, clipper, proofs: [] });
    }

    if (!submissionUrl && !proofVideo && !proofImage) {
      return res.status(400).json({ error: 'Proof link or file required.' });
    }

    submission.proofs.push({
      platform,
      submissionUrl,
      views: viewsNum,
      proofVideo,
      proofImage,
      status: 'pending'
    });

    await submission.save();

    if (isNewClipper) {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { clippersCount: 1 } });
    }

    res.status(201).json(submission);
  } catch (err) {
    console.error('UGC submit-proof error:', err);
    res.status(500).json({ error: 'Could not submit UGC proof.' });
  }
});


/**
 * PATCH /api/clippers/ugc/submissions/:id/proofs/:proofId
 * Update an existing UGC proof (re-verifies on update).
 * Body: { views? }
 * Files (optional): proofVideo, proofImage
 */
router.patch('/ugc/submissions/:id/proofs/:proofId', requireAuth, requireClipper, uploadProof.any(), async (req, res) => {
  try {
    const { id, proofId } = req.params;
    const { views } = req.body;

    const submission = await ClipSubmission.findById(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    if (String(submission.clipper) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your submission.' });
    }

    const proof = submission.proofs.id(proofId);
    if (!proof) return res.status(404).json({ error: 'Proof not found.' });

    const proofVideo = getRelPath(req.files?.find(f => f.fieldname === 'proofVideo'));
    const proofImage = getRelPath(req.files?.find(f => f.fieldname === 'proofImage'));

    if (views !== undefined) proof.views = Number(views) || proof.views;
    if (proofVideo) proof.proofVideo = proofVideo;
    if (proofImage) proof.proofImage = proofImage;

    // Re-queue for verification
    proof.status = 'pending';
    await submission.save();

    res.json(submission);
  } catch (err) {
    console.error('UGC update-proof error:', err);
    res.status(500).json({ error: 'Could not update UGC proof.' });
  }
});


/**
 * GET /api/clippers/ugc/my
 * List my UGC submissions with lightweight campaign info and totals.
 */
router.get('/ugc/my', requireAuth, requireClipper, async (req, res) => {
  try {
    const subs = await ClipSubmission.find({ clipper: req.user._id })
      .populate('campaign', 'title kind rate_per_1000 clipper_cpm status')
      .sort({ createdAt: -1 });

    // Compute per-sub totals
    const formatted = subs.map(s => {
      const approved = (s.proofs || []).filter(p => p.status === 'approved');
      const totalViews = approved.reduce((acc, p) => acc + (p.verifiedViews || 0), 0);
      const totalEarnings = approved.reduce((acc, p) => acc + (p.rewardAmount || 0), 0);
      return {
        _id: s._id,
        campaign: s.campaign,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        totalApprovedViews: totalViews,
        totalEarnings
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('UGC my-submissions error:', err);
    res.status(500).json({ error: 'Could not fetch UGC submissions.' });
  }
});


/**
 * GET /api/clippers/ugc/earnings
 * Simple earnings summary for UGC + normal combined, so clippers see totals.
 */
router.get('/ugc/earnings', requireAuth, requireClipper, async (req, res) => {
  try {
    const agg = await ClipSubmission.aggregate([
      { $match: { clipper: req.user._id } },
      { $unwind: '$proofs' },
      { $match: { 'proofs.status': 'approved' } },
      { $group: {
          _id: null,
          totalEarnings: { $sum: '$proofs.rewardAmount' },
          totalVerifiedViews: { $sum: '$proofs.verifiedViews' }
      } }
    ]);

    const totals = agg[0] || { totalEarnings: 0, totalVerifiedViews: 0 };
    res.json(totals);
  } catch (err) {
    console.error('UGC earnings error:', err);
    res.status(500).json({ error: 'Could not fetch earnings.' });
  }
});

// ======================= END UGC (Clipper) ROUTES ============================

export default router;



