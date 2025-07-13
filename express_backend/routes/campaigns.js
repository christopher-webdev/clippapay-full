// File: express_backend/routes/campaigns.js

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Campaign from '../models/Campaign.js';

import getNextAdWorker from '../utils/getNextAdWorker.js';

import Clip from '../models/Clip.js';
import Wallet from '../models/Wallet.js';
import { requireAuth } from '../middleware/auth.js';


import ClipSubmission from '../models/ClipSubmission.js';


const router = express.Router();


// ─── Multer setup (auto-create upload dir) ───────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads/videos');
fs.mkdirSync(uploadDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:   (_req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, unique + ext);
  }
});
const upload = multer({ storage: videoStorage });
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/campaigns
 * Create a new campaign (advertiser only), with video upload
 */


// ...
router.get('/full',  async (req, res) => {
  try {
    const { fields, limit } = req.query;
    let projection = {};
    if (fields) {
      fields.split(',').forEach(f => projection[f] = 1);
    } else {
      // Default fields for dropdown/search
      projection = { title: 1, _id: 1 };
    }
    const qLimit = limit ? parseInt(limit) : 100;

    const campaigns = await Campaign.find({}, projection)
      .sort({ createdAt: -1 })
      .limit(qLimit);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch all submissions for campaign
    const submissions = await ClipSubmission.find({ campaign: id }).populate('clipper');

    // 2. Flatten all proofs (each proof is a post on a platform)
    let allProofs = [];
    submissions.forEach(sub => {
      sub.proofs.forEach(proof => {
        allProofs.push({
          proof,
          clipper: sub.clipper,
        });
      });
    });

    // 3. History by date (approved proofs, group by day)
    // You can use 'lastVerified' or createdAt as the date, fallback to createdAt if not present
    const historyMap = {};
    let totalVerifiedViews = 0;
    allProofs.forEach(({ proof }) => {
      if (proof.status === 'approved' && typeof proof.verifiedViews === 'number') {
        totalVerifiedViews += proof.verifiedViews;
        const d = proof.lastVerified || proof.updatedAt || proof.createdAt;
        if (!d) return;
        const dateStr = new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
        if (!historyMap[dateStr]) historyMap[dateStr] = 0;
        historyMap[dateStr] += proof.verifiedViews;
      }
    });
    // Convert to array & sort by date
    const history = Object.entries(historyMap)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Clipper Performance Table
    // Each proof becomes a row in table, with clipper name, platform, views, status, link
    const clippers = await Promise.all(allProofs.map(async ({ proof, clipper }) => {
      let clipperName = "";
      if (clipper && clipper.firstName) {
        clipperName = `${clipper.firstName} ${clipper.lastName || ''}`.trim();
      } else if (clipper && clipper.contactName) {
        clipperName = clipper.contactName;
      } else if (clipper && clipper.email) {
        clipperName = clipper.email;
      }
      return {
        id: clipper?._id?.toString() || "",
        name: clipperName || "Anonymous",
        platform: proof.platform,
        views: proof.verifiedViews || proof.views || 0,
        status: proof.status,
        link: proof.submissionUrl,
      };
    }));

    res.json({
      history,
      clippers,
      totalVerifiedViews,
    });
  } catch (err) {
    console.error('Error fetching campaign analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});



router.post(
  '/',
  requireAuth,
  upload.single('video'),
  async (req, res) => {
    try {
      const {
        title, cpv, budget, platforms, countries, hashtags,
        directions, cta_url, categories, numClipsSuggested,
      } = req.body;

      const ratePerView = parseFloat(cpv);  // should be 0.6
      const budgetVal = parseFloat(budget);
      const viewsPurchased = Math.floor(budgetVal / ratePerView);

      const campaignData = {
        advertiser: req.user._id,
        title,
        rate_per_1000: 600, // for reference
        clipper_cpm: 200,   // for reference
        rate_per_view: ratePerView,
        budget_total: budgetVal,
        budget_remaining: budgetVal,
        views_purchased: viewsPurchased,
        views_left: viewsPurchased,
        platforms: JSON.parse(platforms),
        countries: JSON.parse(countries),
        hashtags: JSON.parse(hashtags),
        directions: JSON.parse(directions),
        cta_url: cta_url || undefined,
        categories: JSON.parse(categories),
        numClipsSuggested: parseInt(numClipsSuggested, 10),
      };

      if (req.file) {
        campaignData.video_url = `/uploads/videos/${req.file.filename}`;
      }

      // Assign ad worker here:
      const worker = await getNextAdWorker();
      if (worker) campaignData.assignedWorker = worker._id;

      // ---- WALLET LOGIC ----
      // 1. Find advertiser's wallet
      const advertiserWallet = await Wallet.findOne({ user: req.user._id });
      if (!advertiserWallet) return res.status(400).json({ error: 'Wallet not found.' });

      // 2. Check balance
      if (advertiserWallet.balance < budgetVal)
        return res.status(400).json({ error: 'Insufficient wallet balance.' });

      // 3. Move budget to escrow
      await advertiserWallet.lockEscrow(budgetVal); // throws if insufficient

      // 4. Create campaign
      const campaign = new Campaign(campaignData);
      await campaign.save();

      return res.status(201).json(campaign);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error creating campaign.' });
    }
  }
);



/**
 * GET /api/campaigns
 * Get all campaigns belonging to the logged-in advertiser
 */
router.get(
  '/',
  requireAuth,
  
  async (req, res) => {
    try {
      const camps = await Campaign.find({ advertiser: req.user._id });
      return res.json(camps);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error fetching campaigns.' });
    }
  }
);

/**
 * GET /api/campaigns/assigned
 * Get all campaigns assigned to the logged-in ad-worker
 */
router.get(
  '/assigned',
  requireAuth,
  async (req, res) => {
    if (req.user.role !== 'ad-worker') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    try {
      const camps = await Campaign.find({ assignedWorker: req.user._id })
        .populate('advertiser', 'contactName');
      return res.json(camps);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error fetching assigned campaigns.' });
    }
  }
);

/**
 * PUT /api/campaigns/:id
 * - Advertisers can update any field on their own campaigns.
 * - Ad-workers can only update adWorkerStatus on campaigns assigned to them.
 */
router.put(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) {
        return res.status(404).json({ error: 'Campaign not found.' });
      }

      // Advertiser flow
      if (req.user.role === 'advertiser') {
        if (!camp.advertiser.equals(req.user._id)) {
          return res.status(403).json({ error: 'Access denied.' });
        }
        Object.assign(camp, req.body);
        await camp.save();
        return res.json(camp);
      }

      // Ad-worker flow
      if (req.user.role === 'ad-worker') {
        if (!camp.assignedWorker.equals(req.user._id)) {
          return res.status(403).json({ error: 'Access denied.' });
        }
        const { adWorkerStatus } = req.body;
        if (!['pending','processing','ready','rejected'].includes(adWorkerStatus)) {
          return res.status(400).json({ error: 'Invalid status.' });
        }
        camp.adWorkerStatus = adWorkerStatus;
        await camp.save();
        return res.json(camp);
      }

      // Others
      return res.status(403).json({ error: 'Access denied.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error updating campaign.' });
    }
  }
);

/**
 * DELETE /api/campaigns/:id
 * Delete your own campaign (advertiser only)
 */
router.delete(
  '/:id',
  requireAuth,
 
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp || !camp.advertiser.equals(req.user._id)) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }
      await camp.remove();
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error deleting campaign.' });
    }
  }
);

/**
 * GET /api/campaigns/:id/details
 * - Returns campaign, related clips, advertiser wallet, and stats in one go
 */
router.get('/:id/details', requireAuth, async (req, res) => {
  try {
    // 1. Get the campaign (with populated advertiser and assignedWorker)
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'contactName email')
      .populate('assignedWorker', 'contactName email');
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    // 2. Get all clips for campaign
    const clips = await Clip.find({ campaign: campaign._id })
      .populate('adWorker', 'contactName email');

    // 3. Get wallet for advertiser
    const wallet = await Wallet.findOne({ user: campaign.advertiser._id });

    // 4. You can add additional "stats" or computed fields here:
    const stats = {
      clipsCount: clips.length,
      budgetUsed: campaign.budget_total - campaign.budget_remaining,
      // ...add more as needed
    };

    // 5. Return a unified response
    return res.json({
      campaign,
      clips,
      wallet,
      stats,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});



export default router;
