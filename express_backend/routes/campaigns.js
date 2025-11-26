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


////////////////////////////////////////////////////ugc
// --- UGC assets upload (images/videos/docs for briefs) ---
const ugcAssetsDir = path.join(process.cwd(), 'uploads/ugc-assets');
fs.mkdirSync(ugcAssetsDir, { recursive: true });

const ugcAssetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ugcAssetsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, unique + ext);
  }
});
const ugcAssetUpload = multer({
  storage: ugcAssetStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB per file
});

// Utility: safe JSON parse for array fields
const parseArr = (val, fallback = []) => {
  try {
    if (val == null || val === '') return fallback;
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch { return fallback; }
};

////////////////////////////////////////////////////pgc
// --- PGC assets upload (images/videos/docs for briefs) ---
const pgcAssetsDir = path.join(process.cwd(), 'uploads/pgc-assets');
fs.mkdirSync(pgcAssetsDir, { recursive: true });

const pgcAssetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pgcAssetsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, unique + ext);
  }
});
const pgcAssetUpload = multer({
  storage: pgcAssetStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB per file
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
 * POST /api/campaigns/pgc
 * Create a PGC campaign (advertiser only)
 * - Locks FULL escrow = budget (uses PGC rate_per_video = 7500)
 * - Sets clipper_cpm = 5000 (payout per approved video)
 * - Platform takes 2500 per video
 */
router.post(
  '/pgc',
  requireAuth,
  requireAdvertiser,
  pgcAssetUpload.array('assets', 12), // optional files from form field `assets`
  async (req, res) => {
    try {
      const advertiserId = req.user._id;

      // BODY: title, budget, desiredVideos, platforms[], countries[], hashtags[], directions[], categories[]
      // PGC meta: brief, deliverables[], captionTemplate, usageRights, approvalCriteria, cta_url
      const {
        title,
        budget,
        desiredVideos,
        platforms, countries, hashtags, directions, categories,
        brief,
        deliverables,
        captionTemplate,
        usageRights,
        approvalCriteria,
        cta_url,
      } = req.body;

      // Required fields
      if (!title) return res.status(400).json({ error: 'title is required' });
      if (!brief) return res.status(400).json({ error: 'brief is required' });
      if (!approvalCriteria) return res.status(400).json({ error: 'approvalCriteria is required' });

      const budgetVal = Number(budget);
      const desiredVideosVal = Number(desiredVideos);
      
      if (!Number.isFinite(budgetVal) || budgetVal <= 0) {
        return res.status(400).json({ error: 'Invalid budget' });
      }
      if (!Number.isFinite(desiredVideosVal) || desiredVideosVal < 1 || desiredVideosVal > 50) {
        return res.status(400).json({ error: 'Invalid desired videos count (1-50)' });
      }

      const platformsArr = parseArr(platforms);
      const countriesArr = parseArr(countries);
      const hashtagsArr = parseArr(hashtags);
      const directionsArr = parseArr(directions);
      const categoriesArr = parseArr(categories);
      const deliverablesArr = parseArr(deliverables);

      if (categoriesArr.length === 0) return res.status(400).json({ error: 'At least one category is required' });

      // PGC fixed economics
      const PGC_VIDEO_COST = 7500; // advertiser pays per video
      const PGC_CLIPPER_PAYOUT = 5000; // clipper earns per approved video
      const PLATFORM_FEE = 2500; // platform takes per video

      // Calculate minimum required budget
      const minBudget = desiredVideosVal * PGC_VIDEO_COST;
      if (budgetVal < minBudget) {
        return res.status(400).json({ 
          error: `Budget must be at least ₦${minBudget} for ${desiredVideosVal} videos (₦${PGC_VIDEO_COST} each)` 
        });
      }

      // Calculate maximum videos possible with budget
      const maxVideos = Math.floor(budgetVal / PGC_VIDEO_COST);
      const actualVideos = Math.min(desiredVideosVal, maxVideos);

      // Wallet + escrow check
      const advertiserWallet = await Wallet.findOne({ user: advertiserId });
      if (!advertiserWallet) return res.status(400).json({ error: 'Wallet not found' });
      if (advertiserWallet.balance < budgetVal) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          currentBalance: advertiserWallet.balance,
          required: budgetVal
        });
      }

      // Build assets list (relative paths)
      const assetPaths = (req.files || []).map(f => `/uploads/pgc-assets/${path.basename(f.path)}`);

      // Create campaign document
      const campaign = new Campaign({
        kind: 'pgc',
        advertiser: advertiserId,
        title,

        // Financials
        rate_per_1000: PGC_VIDEO_COST, // Represents cost per video
        clipper_cpm: PGC_CLIPPER_PAYOUT, // Represents payout per video

        // Budget/Videos
        budget_total: budgetVal,
        budget_remaining: budgetVal,
        desiredVideos: actualVideos,
        approvedVideosCount: 0,

        // Targeting/Meta
        platforms: platformsArr,
        countries: countriesArr,
        hashtags: hashtagsArr,
        directions: directionsArr,
        cta_url: cta_url || undefined,
        categories: categoriesArr,

        // PGC meta (reusing ugc subdocument structure)
        ugc: {
          brief: brief || '',
          deliverables: deliverablesArr,
          assets: assetPaths,
          draftRequired: false, // Always false for PGC
          captionTemplate: captionTemplate || '',
          usageRights: usageRights || 'Brand may use and repost creator content on brand social channels and marketing materials.',
          approvalCriteria: approvalCriteria || '',
          hashtags: hashtagsArr,
        },

        status: 'pending',
      });

      // Assign ad worker (optional – reuse your helper)
      const worker = await getNextAdWorker();
      if (worker) campaign.assignedWorker = worker._id;

      // Lock FULL advertiser cost in escrow
      await advertiserWallet.lockEscrow(budgetVal);

      await campaign.save();
      return res.status(201).json(campaign);
    } catch (err) {
      console.error('PGC create error:', err);
      // cleanup uploaded files on error
      for (const f of (req.files || [])) {
        try { await fs.promises.unlink(f.path); } catch {}
      }
      return res.status(500).json({ error: 'Server error creating PGC campaign' });
    }
  }
);
router.get(
  '/pgc',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const rows = await Campaign.find({ advertiser: req.user._id, kind: 'pgc' })
        .sort({ createdAt: -1 });
      return res.json(rows);
    } catch (err) {
      console.error('PGC list error:', err);
      return res.status(500).json({ error: 'Failed to fetch PGC campaigns' });
    }
  }
);
// Update existing GET /:id/details to support PGC
router.get(
  '/:id/pgc/details',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign || !campaign.advertiser.equals(req.user._id)) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const clips = await Clip.find({ campaign: campaign._id })
        .sort({ createdAt: -1 })
        .limit(50)  // Last 30 days approximation; add date filter if needed
        .populate('adWorker', 'contactName email');

      res.json({
        campaign: {
          ...campaign.toObject(),
          // PGC-specific overrides if needed
        },
        clips
      });
    } catch (err) {
      console.error('Campaign details error:', err);
      res.status(500).json({ error: 'Failed to fetch details' });
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
        // (optional) prevent advertisers from forcing worker/status changes
        // const { adWorkerStatus, status, ...safe } = req.body;
        // Object.assign(camp, safe);

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

        // 🚀 When worker marks READY, ensure campaign is ACTIVE
        if (adWorkerStatus === 'ready' && camp.status !== 'active') {
          camp.status = 'active';
        }

        await camp.save();
        if (camp.status === 'active') {
            import('../utils/telegram.js').then(module => {
              module.sendTelegramCampaignAlert(camp);
            });
}
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




/**
 * POST /api/campaigns/ugc
 * Create a UGC campaign (advertiser only)
 * - Locks FULL escrow = budget (uses UGC rate_per_1000 = 5000)
 * - Sets clipper_cpm = 2000
 */
// router.post(
//   '/ugc',
//   requireAuth,
//   requireAdvertiser,
//   ugcAssetUpload.array('assets', 12), // optional files from form field `assets`
//   async (req, res) => {
//     try {
//       const advertiserId = req.user._id;

//       // BODY: title, budget, platforms[], countries[], hashtags[], directions[], categories[], numClipsSuggested
//       // UGC meta: brief, deliverables[], draftRequired, captionTemplate, usageRights, creativeDeadline, postDeadline
//       const {
//         title,
//         budget,
//         platforms, countries, hashtags, directions, categories,
//         numClipsSuggested,

//         brief,
//         deliverables,
//         draftRequired,
//         captionTemplate,
//         usageRights,
//         creativeDeadline,
//         postDeadline,
//       } = req.body;

//       // Required
//       if (!title) return res.status(400).json({ error: 'title is required' });
//       const budgetVal = Number(budget);
//       if (!Number.isFinite(budgetVal) || budgetVal <= 0) {
//         return res.status(400).json({ error: 'Invalid budget' });
//       }

//       const platformsArr   = parseArr(platforms);
//       const countriesArr   = parseArr(countries);
//       const hashtagsArr    = parseArr(hashtags);
//       const directionsArr  = parseArr(directions);
//       const categoriesArr  = parseArr(categories);
//       const deliverablesArr= parseArr(deliverables);

//       if (platformsArr.length === 0) return res.status(400).json({ error: 'At least one platform is required' });
//       if (categoriesArr.length === 0) return res.status(400).json({ error: 'At least one category is required' });

//       // UGC fixed economics
//       const UGC_ADVERTISER_CPM = 5000; // advertiser pays
//       const UGC_CLIPPER_CPM    = 2000; // clipper earns
//       const costPerView        = UGC_ADVERTISER_CPM / 1000; // ₦5 per view

//       // Minimum 1,000 views (₦5,000)
//       if (budgetVal < 1000 * costPerView) {
//         return res.status(400).json({ error: 'Minimum budget for UGC is ₦5,000 (1,000 views)' });
//       }

//       // Views purchasable from budget at advertiser rate
//       const viewsPurchased = Math.floor(budgetVal / costPerView);

//       // Wallet + escrow
//       const advertiserWallet = await Wallet.findOne({ user: advertiserId });
//       if (!advertiserWallet) return res.status(400).json({ error: 'Wallet not found' });
//       if (advertiserWallet.balance < budgetVal) {
//         return res.status(400).json({
//           error: 'Insufficient wallet balance',
//           currentBalance: advertiserWallet.balance,
//           required: budgetVal
//         });
//       }

//       // Build assets list (relative paths)
//       const assetPaths = (req.files || []).map(f => `/uploads/ugc-assets/${path.basename(f.path)}`);

//       // Create campaign document
//       const campaign = new Campaign({
//         kind: 'ugc',
//         advertiser: advertiserId,
//         title,

//         // Financials
//         rate_per_1000: UGC_ADVERTISER_CPM,
//         clipper_cpm: UGC_CLIPPER_CPM,

//         // Budget/Views
//         budget_total: budgetVal,
//         budget_remaining: budgetVal,
//         views_purchased: viewsPurchased,
//         views_left: viewsPurchased,

//         // Targeting/Meta
//         platforms: platformsArr,
//         countries: countriesArr,
//         hashtags: hashtagsArr,
//         directions: directionsArr,
//         cta_url: req.body.cta_url || undefined,
//         categories: categoriesArr,
//         numClipsSuggested: Number.parseInt(numClipsSuggested || '1', 10) || 1,

//         // UGC meta
//         ugc: {
//           brief: brief || '',
//           deliverables: deliverablesArr,
//           assets: assetPaths,
//           draftRequired: typeof draftRequired === 'string' ? draftRequired === 'true' : (draftRequired ?? true),
//           captionTemplate: captionTemplate || '',
//           usageRights: usageRights || '',
//           creativeDeadline: creativeDeadline ? new Date(creativeDeadline) : undefined,
//           postDeadline: postDeadline ? new Date(postDeadline) : undefined,
//           hashtags: hashtagsArr, // can override/append if you want different behavior
//         },

//         status: 'pending',
//       });

//       // Assign ad worker (optional – reuse your helper)
//       const worker = await getNextAdWorker();
//       if (worker) campaign.assignedWorker = worker._id;

//       // Lock FULL advertiser cost in escrow
//       await advertiserWallet.lockEscrow(budgetVal);

//       await campaign.save();
//       return res.status(201).json(campaign);
//     } catch (err) {
//       console.error('UGC create error:', err);
//       // cleanup uploaded files on error
//       for (const f of (req.files || [])) {
//         try { await fs.promises.unlink(f.path); } catch {}
//       }
//       return res.status(500).json({ error: 'Server error creating UGC campaign' });
//     }
//   }
// );
// POST /api/campaigns/ugc - NEW 2025 50/50 UGC HYBRID MODEL
router.post(
  '/ugc',
  requireAuth,
  requireAdvertiser,
  ugcAssetUpload.array('assets', 12),
  async (req, res) => {
    try {
      const advertiserId = req.user._id;
      const {
        title,
        budget: budgetStr,
        brief,
        deliverables,
        captionTemplate,
        usageRights,
        draftRequired,
        creativeDeadline,
        postDeadline,
        platforms,
        countries,
        hashtags,
        directions,
        categories,
        numClipsSuggested,
        cta_url
      } = req.body;

      // === VALIDATION ===
      if (!title?.trim()) return res.status(400).json({ error: 'Campaign title is required' });

      const budget = Number(budgetStr);
      if (!Number.isFinite(budget) || budget < 10000 || budget % 1000 !== 0) {
        return res.status(400).json({ error: 'Budget must be at least ₦10,000 and in ₦1,000 increments' });
      }

      const platformsArr = parseArr(platforms);
      if (platformsArr.length === 0) return res.status(400).json({ error: 'At least one platform required' });

      // === 50/50 SPLIT CALCULATION ===
      const halfBudget = budget / 2;

      const CLIPPER_FIXED_PAYOUT = 2000;
      const PLATFORM_FEE_PER_CLIPPER = 500;
      const COST_PER_CLIPPER_SLOT = CLIPPER_FIXED_PAYOUT + PLATFORM_FEE_PER_CLIPPER; // ₦2,500

      const clipperSlots = Math.floor(halfBudget / COST_PER_CLIPPER_SLOT);
      const fixedCost = clipperSlots * COST_PER_CLIPPER_SLOT;
      const viewsBudget = halfBudget; // 50% of total
      const viewsPurchased = Math.floor(viewsBudget / 5); // ₦5 per view (advertiser cost)

      if (clipperSlots < 1) {
        return res.status(400).json({ error: 'Budget too low — need at least ₦10,000 for 1 clipper + views' });
      }

      // === WALLET CHECK & ESCROW LOCK ===
      const wallet = await Wallet.findOne({ user: advertiserId });
      if (!wallet) return res.status(400).json({ error: 'Wallet not found' });
      if (wallet.balance < budget) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          currentBalance: wallet.balance,
          required: budget
        });
      }

      await wallet.lockEscrow(budget);

      // === PROCESS ASSETS ===
      const assetPaths = (req.files || []).map(f => `/uploads/ugc-assets/${path.basename(f.path)}`);

      // === CREATE CAMPAIGN + UGC VERSIONING ===
      const campaign = await Campaign.create({
        advertiser: advertiserId,
        title: title.trim(),
        kind: 'ugc',

        // *** NEW VERSIONING FIELD ***
        ugcVersion: 2,  // 👈 this ensures NEW UGC rules (₦2,000 once per clipper)

        // Financials
        budget_total: budget,
        budget_remaining: budget,
        rate_per_1000: 5000,     // ₦5 CPM = advertiser
        clipper_cpm: 2000,       // ₦2 CPM = clipper from views

        // Views
        views_purchased: viewsPurchased,
        views_left: viewsPurchased,

        // NEW UGC HYBRID FIELDS
        clipperSlots,
        approvedClipperCount: 0,
        fixedClipperPayout: CLIPPER_FIXED_PAYOUT,
        platformFeePerClipper: PLATFORM_FEE_PER_CLIPPER,

        // Targeting
        platforms: platformsArr,
        countries: parseArr(countries),
        hashtags: parseArr(hashtags),
        directions: parseArr(directions),
        categories: parseArr(categories),
        cta_url: cta_url || undefined,
        numClipsSuggested: Number(numClipsSuggested) || 1,

        // UGC Brief
        ugc: {
          brief: brief || '',
          deliverables: parseArr(deliverables),
          assets: assetPaths,
          draftRequired: draftRequired === 'true' || draftRequired === true,
          captionTemplate: captionTemplate || '',
          usageRights: usageRights || 'Brand may repost creator content on brand social channels.',
          creativeDeadline: creativeDeadline ? new Date(creativeDeadline) : undefined,
          postDeadline: postDeadline ? new Date(postDeadline) : undefined,
        },

        status: 'pending',
      });

      // Optional: assign ad worker
      const worker = await getNextAdWorker();
      if (worker) campaign.assignedWorker = worker._id;
      await campaign.save();

      res.status(201).json({
        message: 'UGC Campaign Created Successfully!',
        campaign,
        breakdown: {
          totalBudget: budget,
          clipperSlots,
          fixedCost,
          clipperPayoutTotal: clipperSlots * CLIPPER_FIXED_PAYOUT,
          platformFeesTotal: clipperSlots * PLATFORM_FEE_PER_CLIPPER,
          viewsBudget,
          estimatedViews: viewsPurchased
        }
      });

    } catch (err) {
      console.error('UGC creation error:', err);

      // Clean uploaded files
      for (const file of (req.files || [])) {
        try { await fs.promises.unlink(file.path); } catch {}
      }

      res.status(500).json({ error: 'Failed to create UGC campaign', details: err.message });
    }
  }
);

// GET /api/campaigns/recent-for-ticker
// Returns all active campaigns created in the last 3 days – for the ticker
router.get('/recent-for-ticker', async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const recent = await Campaign.find({
      status: 'active',
      createdAt: { $gte: threeDaysAgo }
    })
      .select('title kind createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(recent);
  } catch (err) {
    console.error('Recent campaigns ticker error:', err);
    res.status(500).json([]);
  }
});
/**
 * GET /api/campaigns/ugc
 * List advertiser's UGC campaigns
 */
router.get(
  '/ugc',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const rows = await Campaign.find({ advertiser: req.user._id, kind: 'ugc' })
        .sort({ createdAt: -1 });
      return res.json(rows);
    } catch (err) {
      console.error('UGC list error:', err);
      return res.status(500).json({ error: 'Failed to fetch UGC campaigns' });
    }
  }
);
/**
 * PATCH /api/campaigns/:id/ugc
 * Update UGC-specific fields (owner advertiser only)
 */
router.patch(
  '/:id/ugc',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });
      if (camp.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign' });

      const {
        brief, deliverables, captionTemplate, usageRights,
        draftRequired, creativeDeadline, postDeadline, hashtags
      } = req.body;

      camp.ugc = camp.ugc || {};
      if (brief !== undefined) camp.ugc.brief = brief;
      if (deliverables !== undefined) camp.ugc.deliverables = parseArr(deliverables, camp.ugc.deliverables || []);
      if (captionTemplate !== undefined) camp.ugc.captionTemplate = captionTemplate;
      if (usageRights !== undefined) camp.ugc.usageRights = usageRights;
      if (hashtags !== undefined) camp.ugc.hashtags = parseArr(hashtags, camp.ugc.hashtags || []);
      if (draftRequired !== undefined) {
        camp.ugc.draftRequired = typeof draftRequired === 'string' ? draftRequired === 'true' : !!draftRequired;
      }
      if (creativeDeadline !== undefined) camp.ugc.creativeDeadline = creativeDeadline ? new Date(creativeDeadline) : undefined;
      if (postDeadline !== undefined) camp.ugc.postDeadline = postDeadline ? new Date(postDeadline) : undefined;

      await camp.save();
      return res.json(camp);
    } catch (err) {
      console.error('UGC update error:', err);
      return res.status(500).json({ error: 'Failed to update UGC campaign' });
    }
  }
);
/**
 * POST /api/campaigns/:id/ugc/assets
 * Append assets to UGC campaign
 */
router.post(
  '/:id/ugc/assets',
  requireAuth,
  requireAdvertiser,
  ugcAssetUpload.array('assets', 12),
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });
      if (camp.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign' });

      const newAssets = (req.files || []).map(f => `/uploads/ugc-assets/${path.basename(f.path)}`);
      camp.ugc = camp.ugc || {};
      camp.ugc.assets = [...(camp.ugc.assets || []), ...newAssets];

      await camp.save();
      return res.json({ assets: camp.ugc.assets });
    } catch (err) {
      console.error('UGC assets upload error:', err);
      // cleanup uploaded files on error
      for (const f of (req.files || [])) {
        try { await fs.promises.unlink(f.path); } catch {}
      }
      return res.status(500).json({ error: 'Failed to upload assets' });
    }
  }
);

router.post(
  '/:id/pgc/assets',
  requireAuth,
  requireAdvertiser,
  ugcAssetUpload.array('assets', 12),
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });
      if (camp.kind !== 'pgc') return res.status(400).json({ error: 'Not a UGC campaign' });

      const newAssets = (req.files || []).map(f => `/uploads/pgc-assets/${path.basename(f.path)}`);
      camp.pgc = camp.pgc || {};
      camp.pgc.assets = [...(camp.pgc.assets || []), ...newAssets];

      await camp.save();
      return res.json({ assets: camp.pgc.assets });
    } catch (err) {
      console.error('PGC assets upload error:', err);
      // cleanup uploaded files on error
      for (const f of (req.files || [])) {
        try { await fs.promises.unlink(f.path); } catch {}
      }
      return res.status(500).json({ error: 'Failed to upload assets' });
    }
  }
);
/**
 * DELETE /api/campaigns/:id/ugc/assets/:index
 * Remove an asset from UGC campaign (and delete file)
 */
router.delete(
  '/:id/ugc/assets/:index',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const idx = Number(req.params.index);
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });
      if (camp.kind !== 'ugc') return res.status(400).json({ error: 'Not a UGC campaign' });

      const assets = camp.ugc?.assets || [];
      if (!(idx >= 0 && idx < assets.length)) {
        return res.status(400).json({ error: 'Invalid asset index' });
      }

      const [removed] = assets.splice(idx, 1);
      camp.ugc.assets = assets;
      await camp.save();

      // delete file
      if (removed) {
        const abs = path.join(process.cwd(), removed);
        try { await fs.promises.unlink(abs); } catch {}
      }

      return res.json({ assets });
    } catch (err) {
      console.error('UGC asset delete error:', err);
      return res.status(500).json({ error: 'Failed to delete asset' });
    }
  }
);
/**
 * POST /api/campaigns/:id/activate
 * Move campaign to 'active' (owner advertiser)
 * (Escrow should already be locked at creation; this is just a status change)
 */
router.post(
  '/:id/activate',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });
      if (camp.status === 'active') return res.json(camp);

      camp.status = 'active';
      await camp.save();
      return res.json(camp);
    } catch (err) {
      console.error('UGC activate error:', err);
      return res.status(500).json({ error: 'Failed to activate campaign' });
    }
  }
);
/**
 * POST /api/campaigns/:id/fund
 * Top-up budget for a campaign (locks full advertiser cost to escrow)
 * body: { amount: number }
 */
router.post(
  '/:id/fund',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found' });
      if (!camp.advertiser.equals(req.user._id)) return res.status(403).json({ error: 'Access denied' });

      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet) return res.status(400).json({ error: 'Wallet not found' });
      if (wallet.balance < amount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          currentBalance: wallet.balance,
          required: amount
        });
      }

      // Lock full amount in escrow
      await wallet.lockEscrow(amount);

      // Update campaign financials/views based on advertiser CPM
      const costPerView = camp.rate_per_1000 / 1000; // e.g., 5 for UGC
      const addViews = Math.floor(amount / costPerView);

      camp.budget_total     += amount;
      camp.budget_remaining += amount;
      camp.views_purchased  += addViews;
      camp.views_left       += addViews;

      await camp.save();
      return res.json(camp);
    } catch (err) {
      console.error('UGC fund error:', err);
      return res.status(500).json({ error: 'Failed to fund campaign' });
    }
  }
);


/**
 * GET /api/campaigns/pgc/approved-videos
 * Fetch all approved PGC videos for the logged-in advertiser
 */
router.get(
  '/pgc/approved-videos',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      // Find all PGC campaigns belonging to this advertiser
      const pgcCampaigns = await Campaign.find({
        advertiser: req.user._id,
        kind: 'pgc'
      }).select('_id title');

      const campaignIds = pgcCampaigns.map(c => c._id);

      // Find all approved proofs from PGC campaigns
      const submissions = await ClipSubmission.find({
        campaign: { $in: campaignIds }
      })
        .populate('clipper', 'firstName lastName email')
        .populate('campaign', 'title');

      // Extract approved videos
      const approvedVideos = [];
      
      submissions.forEach(submission => {
        submission.proofs.forEach(proof => {
          if (proof.status === 'approved' && proof.proofVideo) {
            approvedVideos.push({
              _id: proof._id,
              url: proof.proofVideo,
              createdAt: proof.createdAt || submission.createdAt,
              status: proof.status,
              campaign: {
                _id: submission.campaign._id,
                title: submission.campaign.title
              },
              clipper: submission.clipper
            });
          }
        });
      });

      // Sort by creation date (newest first)
      approvedVideos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(approvedVideos);
    } catch (err) {
      console.error('Error fetching approved PGC videos:', err);
      res.status(500).json({ error: 'Failed to fetch approved videos' });
    }
  }
);

export default router;
