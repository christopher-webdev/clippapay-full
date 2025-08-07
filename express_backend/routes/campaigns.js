// File: express_backend/routes/campaigns.js

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Campaign from '../models/Campaign.js';

import getNextAdWorker from '../utils/getNextAdWorker.js';

import Clip from '../models/Clip.js';
import Wallet from '../models/Wallet.js';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js';


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
// Add this near your other multer setup (around line 20)

const thumbnailStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads/thumbnails')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, unique + ext);
  }
});
const thumbnailUpload = multer({ 
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});
/**
 * POST /api/campaigns
 * Create a new campaign (advertiser only), with video upload

 */
router.get(
  '/full',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { fields, limit } = req.query;
      const advertiserId = req.user._id;

      // Build projection
      let projection = {};
      if (fields) {
        fields.split(',').forEach((f) => (projection[f] = 1));
      } else {
        // Default for dropdown/search
        projection = { title: 1, _id: 1 };
      }

      const qLimit = limit ? parseInt(limit, 10) : 100;

      // Filter campaigns by advertiser
      const campaigns = await Campaign.find({ advertiser: advertiserId }, projection)
        .sort({ createdAt: -1 })
        .limit(qLimit);

      res.json(campaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }
);

/**
 * GET /:id/analytics
 * Fetch analytics for a single campaign (restricted to the owner advertiser)
 */
router.get(
  '/:id/analytics',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const advertiserId = req.user._id;

      // Ensure this campaign belongs to the advertiser
      const campaign = await Campaign.findOne({ _id: id, advertiser: advertiserId });
      if (!campaign) {
        return res.status(403).json({ error: 'Not authorized to view this campaign' });
      }

      // 1. Fetch all submissions for this campaign
      const submissions = await ClipSubmission.find({ campaign: id }).populate('clipper');

      // 2. Flatten all proofs
      let allProofs = [];
      submissions.forEach((sub) => {
        (sub.proofs || []).forEach((proof) => {
          allProofs.push({
            proof,
            clipper: sub.clipper,
          });
        });
      });

      // 3. History by date (approved proofs, grouped by day)
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

      const history = Object.entries(historyMap)
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 4. Clipper Performance Table
      const clippers = await Promise.all(
        allProofs.map(async ({ proof, clipper }) => {
          let clipperName = '';
          if (clipper && clipper.firstName) {
            clipperName = `${clipper.firstName} ${clipper.lastName || ''}`.trim();
          } else if (clipper && clipper.contactName) {
            clipperName = clipper.contactName;
          } else if (clipper && clipper.email) {
            clipperName = clipper.email;
          }
          return {
            id: clipper?._id?.toString() || '',
            name: clipperName || 'Anonymous',
            platform: proof.platform,
            views: proof.verifiedViews || proof.views || 0,
            status: proof.status,
            link: proof.submissionUrl,
          };
        })
      );

      res.json({
        history,
        clippers,
        totalVerifiedViews,
      });
    } catch (err) {
      console.error('Error fetching campaign analytics:', err);
      res.status(500).json({ error: 'Failed to fetch analytics.' });
    }
  }
);

router.post(
  '/',
  requireAuth,
  upload.single('video'),
  async (req, res) => {
    try {
      // 1. File Validation
      const MAX_FILE_SIZE_MB = 300;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
      const ALLOWED_MIME_TYPES = [
        'video/mp4',
        'video/quicktime',  // MOV
        'video/x-msvideo',  // AVI
        'video/webm'
      ];

      if (req.file) {
        // Validate file size
        if (req.file.size > MAX_FILE_SIZE_BYTES) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ 
            error: `Video file exceeds ${MAX_FILE_SIZE_MB}MB limit` 
          });
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            error: 'Invalid file type. Only MP4, MOV, AVI, and WEBM are allowed'
          });
        }
      } else {
        return res.status(400).json({ error: 'Video file is required' });
      }

      // 2. Data Validation
      const {
        title, cpv, budget, platforms, countries, hashtags,
        directions, cta_url, categories, numClipsSuggested,
      } = req.body;

      // Validate required fields
      const requiredFields = {
        title, cpv, budget, platforms, countries,
        hashtags, directions, categories, numClipsSuggested
      };

      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: `${field} is required` });
        }
      }

      // Validate numerical values
      const ratePerView = parseFloat(cpv);
      const budgetVal = parseFloat(budget);
      const clipsSuggested = parseInt(numClipsSuggested, 10);

      if (isNaN(ratePerView)) {
        return res.status(400).json({ error: 'Invalid rate per view value' });
      }

      if (isNaN(budgetVal)) {
        return res.status(400).json({ error: 'Invalid budget value' });
      }

      if (isNaN(clipsSuggested)) {
        return res.status(400).json({ error: 'Invalid clips suggested value' });
      }

      // Validate budget minimum
      const MIN_BUDGET = 1200; // ₦600 minimum (1000 views)
      if (budgetVal < MIN_BUDGET) {
        return res.status(400).json({
          error: `Minimum budget is ₦${MIN_BUDGET} (1000 views)`
        });
      }

      // Validate JSON fields
      try {
        const platformsArr = JSON.parse(platforms);
        const countriesArr = JSON.parse(countries);
        const hashtagsArr = JSON.parse(hashtags);
        const directionsArr = JSON.parse(directions);
        const categoriesArr = JSON.parse(categories);

        if (!Array.isArray(platformsArr) || platformsArr.length === 0) {
          throw new Error('At least one platform must be selected');
        }

        if (!Array.isArray(categoriesArr) || categoriesArr.length === 0) {
          throw new Error('At least one category must be selected');
        }
      } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: err.message });
      }

      // 3. Business Logic Validation
      const viewsPurchased = Math.floor(budgetVal / ratePerView);
      if (viewsPurchased < 1000) {
        return res.status(400).json({
          error: 'Budget too low for meaningful campaign (minimum 1000 views)'
        });
      }

      // 4. Wallet Validation
      const advertiserWallet = await Wallet.findOne({ user: req.user._id });
      if (!advertiserWallet) {
        return res.status(400).json({ error: 'Wallet not found' });
      }

      if (advertiserWallet.balance < budgetVal) {
        return res.status(400).json({ 
          error: 'Insufficient wallet balance',
          currentBalance: advertiserWallet.balance,
          required: budgetVal
        });
      }

      // 5. Create Campaign
      const campaignData = {
        advertiser: req.user._id,
        title,
        rate_per_1000: 1200,
        clipper_cpm: 500,
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
        numClipsSuggested: clipsSuggested,
        video_url: `/uploads/videos/${req.file.filename}`
      };

      // Assign ad worker
      const worker = await getNextAdWorker();
      if (worker) campaignData.assignedWorker = worker._id;

      // Move budget to escrow
      await advertiserWallet.lockEscrow(budgetVal);

      const campaign = new Campaign(campaignData);
      await campaign.save();

      return res.status(201).json(campaign);

     } catch (err) {
      console.error(err);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        error: 'Server error creating campaign',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
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
        .populate('advertiser', 'contactName firstName lastName company email creatorTypes otherCreatorType');
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

router.delete(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp || !camp.advertiser.equals(req.user._id)) {
        return res.status(404).json({ error: 'Campaign not found or access denied.' });
      }

      // Attempt to delete the uploaded video if it exists
      if (camp.video_url) {
        const filePath = path.join(process.cwd(), camp.video_url);
        try {
          await fs.promises.unlink(filePath);
          console.log('Deleted campaign video:', filePath);
        } catch (err) {
          console.warn('Failed to delete campaign video:', err.message);
        }
      }

      // Remove campaign from DB
      await camp.deleteOne();

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



/**
 * POST /api/campaigns/:id/thumbnail
 * Upload or update a thumbnail for a campaign
 * - Advertisers can update their own campaigns
 * - Ad-workers can update campaigns assigned to them
 */
router.post(
  '/:id/thumbnail',
  requireAuth,
  thumbnailUpload.single('thumbnail'),
  async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Authorization check
      const isAdvertiser = req.user.role === 'advertiser' && 
                          campaign.advertiser.equals(req.user._id);
      const isAssignedWorker = req.user.role === 'ad-worker' && 
                             campaign.assignedWorker?.equals(req.user._id);
      
      if (!isAdvertiser && !isAssignedWorker) {
        return res.status(403).json({ error: 'Not authorized to update this campaign' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No thumbnail file provided' });
      }

      // Delete old thumbnail if it exists
      if (campaign.thumb_url) {
        const oldPath = path.join(process.cwd(), campaign.thumb_url);
        try {
          await fs.promises.unlink(oldPath);
        } catch (err) {
          console.warn('Failed to delete old thumbnail:', err.message);
        }
      }

      // Update campaign with new thumbnail path
      campaign.thumb_url = `/uploads/thumbnails/${req.file.filename}`;
      await campaign.save();

      res.json({ 
        thumb_url: campaign.thumb_url,
        message: 'Thumbnail uploaded successfully' 
      });

    } catch (err) {
      console.error('Thumbnail upload error:', err);
      
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupErr) {
          console.error('Failed to clean up thumbnail:', cleanupErr);
        }
      }

      const status = err.message.includes('Not authorized') ? 403 : 
                    err.message.includes('allowed') ? 400 : 500;
      
      res.status(status).json({ 
        error: err.message || 'Failed to upload thumbnail' 
      });
    }
  }
);

/**
 * DELETE /api/campaigns/:id/thumbnail
 * Remove the thumbnail from a campaign
 */
router.delete(
  '/:id/thumbnail',
  requireAuth,
  async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Authorization check (same as upload)
      const isAdvertiser = req.user.role === 'advertiser' && 
                          campaign.advertiser.equals(req.user._id);
      const isAssignedWorker = req.user.role === 'ad-worker' && 
                             campaign.assignedWorker?.equals(req.user._id);
      
      if (!isAdvertiser && !isAssignedWorker) {
        return res.status(403).json({ error: 'Not authorized to update this campaign' });
      }

      if (!campaign.thumb_url) {
        return res.status(400).json({ error: 'No thumbnail to remove' });
      }

      // Delete the file
      const thumbPath = path.join(process.cwd(), campaign.thumb_url);
      try {
        await fs.promises.unlink(thumbPath);
      } catch (err) {
        console.warn('Failed to delete thumbnail file:', err.message);
      }

      // Update campaign
      campaign.thumb_url = '';
      await campaign.save();

      res.json({ message: 'Thumbnail removed successfully' });

    } catch (err) {
      console.error('Thumbnail removal error:', err);
      res.status(500).json({ error: 'Failed to remove thumbnail' });
    }
  }
);
export default router;
