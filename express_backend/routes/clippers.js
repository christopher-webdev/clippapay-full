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


const router = express.Router();

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
    const { submissionUrl, views } = req.body;
    const platform = req.body.platform;
    const clipper = req.user._id;
    const campaign = req.params.id;

    const proofVideo = getRelPath(req.files?.find(f => f.fieldname === 'proofVideo'));
    const proofImage = getRelPath(req.files?.find(f => f.fieldname === 'proofImage'));
    const viewsNum = Number(views) || 0;

    // Find by campaign+clipper (ignore platform for unique join)
    let isNewClipper = false;
    let submission = await ClipSubmission.findOne({ campaign, clipper });

    if (!submission) {
      isNewClipper = true;
      submission = new ClipSubmission({ campaign, clipper, proofs: [] });
    }

    // Prevent duplicate proof (same link for this campaign/platform)
    if (submission.proofs.some(p => p.submissionUrl === submissionUrl && p.platform === platform)) {
      return res.status(409).json({ error: 'This proof link has already been submitted for this campaign and platform.' });
    }

    // Require at least one type of proof
    if (!submissionUrl && !proofVideo && !proofImage) {
      return res.status(400).json({ error: 'Proof link or file required.' });
    }

    // Add new proof to proofs array
    submission.proofs.push({
      platform,
      submissionUrl,
      views: viewsNum,
      proofVideo,
      proofImage,
      status: 'pending'
    });

    await submission.save();

    // --- Increment clippersCount if first submission for this campaign ---
    if (isNewClipper) {
      await Campaign.findByIdAndUpdate(
        campaign,
        { $inc: { clippersCount: 1 } }
      );
    }

    res.status(201).json(submission);
  } catch (err) {
    console.error('Error in /submit-clip:', err);
    res.status(500).json({ error: 'Could not submit.' });
  }
});

// PATCH /clippers/:id/update-proof/:proofId
router.patch('/:id/update-proof/:proofId', requireAuth, uploadProof.any(), async (req, res) => {
  try {
    const { views } = req.body;
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


/**
 * GET /api/clippers/my-submissions
 * List all submissions for this user
 */
router.get('/my-submissions', requireAuth, async (req, res) => {
  try {
    const subs = await ClipSubmission.find({ clipper: req.user._id })
    .populate('campaign', 'title')
    .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch submissions.' });
  }
});


/**
 * GET /api/campaigns/available
 * List campaigns clippers can join/post to, following all business rules.
 */
router.get('/available', requireAuth, async (req, res) => {
  try {
    // No more _id: { $nin: joined }
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const campaigns = await Campaign.find({
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
      '_id title thumb_url rate_per_1000 clipper_cpm budget_total budget_remaining views_purchased views_left categories hashtags status adWorkerStatus createdAt updatedAt'
    );

    res.json(campaigns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch available campaigns.' });
  }
});



router.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'contactName email');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    // Only show to clippers if campaign is active & ready
    if (
      campaign.status !== 'active' ||
      campaign.adWorkerStatus !== 'ready'
    ) {
      return res.status(403).json({ error: 'Campaign not available.' });
    }

    // Get the AD-WORKER CLIPS for this campaign
    const clips = await Clip.find({ campaign: campaign._id })
      .sort('index')
      .select('_id url index'); // only basic info

    res.json({
      id: campaign._id,
      title: campaign.title,
      advertiser: campaign.advertiser?.contactName || 'Advertiser',
      description: campaign.description || '',
      thumbUrl: campaign.thumb_url,
      payPerView: campaign.clipper_cpm ?? 500,
      totalViews: campaign.views_purchased,
      clippersCount: campaign.clippersCount,
      platforms: campaign.platforms,
      instructions: campaign.directions,
      hashtags: campaign.hashtags,
      status: campaign.status,
      clips: clips.map(c => ({
        id: c._id,
        url: c.url,
        index: c.index,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch campaign details.' });
  }
});
export default router;



