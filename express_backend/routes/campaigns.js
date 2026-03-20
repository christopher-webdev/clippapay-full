// routes/campaigns.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import Campaign from '../models/Campaign.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js'; // assume you have role middleware
import { requireAdminAuth } from '../middleware/adminAuth.js';
import fs from 'fs';

import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import ClippingCampaign from '../models/ClippingCampaign.js';
import ClipSubmission from '../models/ClipSubmission.js';
import Transaction from '../models/Transaction.js';


const router = express.Router();
// MULTER CONFIG – THUMBNAIL
const uploadDir = path.join(process.cwd(), 'uploads/campaigns');

// Make sure folder exists (redundant if you use the startup function, but safe)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Ensured campaigns upload dir exists: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webm', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP images allowed'), false);
    }
  },
});

// routes/campaigns.js - Add this new endpoint

// GET /api/campaigns/:id/with-submissions
router.get('/:id/with-submissions', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName company profileImage')
      .populate('selectedClipper', 'firstName lastName profileImage rating')
      .populate({
        path: 'videoSubmissions.applicationId',
        select: 'proposedRateNGN proposedRateUSDT paymentCurrency paymentAmount revisionCount status'
      })
      .populate({
        path: 'videoSubmissions.clipperId',
        select: 'firstName lastName profileImage rating'
      });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if user is the advertiser
    if (campaign.advertiser._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the payment info from the approved/final application
    let paymentAmount = null;
    let paymentCurrency = null;
    
    // First try to get from finalVideo's applicationId
    if (campaign.finalVideo && campaign.finalVideo.applicationId) {
      const finalApplication = campaign.videoSubmissions.find(function(sub) {
        return sub.applicationId && sub.applicationId._id && 
               sub.applicationId._id.toString() === campaign.finalVideo.applicationId.toString();
      });
      
      if (finalApplication && finalApplication.applicationId) {
        paymentAmount = finalApplication.applicationId.paymentAmount || 
                       finalApplication.applicationId.proposedRateNGN || 
                       finalApplication.applicationId.proposedRateUSDT;
        paymentCurrency = finalApplication.applicationId.paymentCurrency || 
                         (finalApplication.applicationId.proposedRateNGN ? 'NGN' : 
                          finalApplication.applicationId.proposedRateUSDT ? 'USDT' : null);
      }
    }
    
    // If no payment from finalVideo, try the currentSubmission
    if (!paymentAmount && campaign.currentSubmission) {
      const currentApp = campaign.videoSubmissions.find(function(sub) {
        return sub.applicationId && sub.applicationId._id && 
               sub.applicationId._id.toString() === campaign.currentSubmission.toString();
      });
      
      if (currentApp && currentApp.applicationId) {
        paymentAmount = currentApp.applicationId.paymentAmount || 
                       currentApp.applicationId.proposedRateNGN || 
                       currentApp.applicationId.proposedRateUSDT;
        paymentCurrency = currentApp.applicationId.paymentCurrency || 
                         (currentApp.applicationId.proposedRateNGN ? 'NGN' : 
                          currentApp.applicationId.proposedRateUSDT ? 'USDT' : null);
      }
    }
    
    // If still no payment, try the selectedClipper's application
    if (!paymentAmount && campaign.selectedClipper) {
      const clipperApp = campaign.videoSubmissions.find(function(sub) {
        return sub.clipperId && sub.clipperId._id && 
               sub.clipperId._id.toString() === campaign.selectedClipper.toString();
      });
      
      if (clipperApp && clipperApp.applicationId) {
        paymentAmount = clipperApp.applicationId.paymentAmount || 
                       clipperApp.applicationId.proposedRateNGN || 
                       clipperApp.applicationId.proposedRateUSDT;
        paymentCurrency = clipperApp.applicationId.paymentCurrency || 
                         (clipperApp.applicationId.proposedRateNGN ? 'NGN' : 
                          clipperApp.applicationId.proposedRateUSDT ? 'USDT' : null);
      }
    }

    // Also check for approved submissions if we still don't have payment
    if (!paymentAmount && campaign.videoSubmissions && campaign.videoSubmissions.length > 0) {
      const approvedSubmission = campaign.videoSubmissions.find(function(sub) {
        return sub.status === 'approved' && sub.applicationId;
      });
      
      if (approvedSubmission && approvedSubmission.applicationId) {
        paymentAmount = approvedSubmission.applicationId.paymentAmount || 
                       approvedSubmission.applicationId.proposedRateNGN || 
                       approvedSubmission.applicationId.proposedRateUSDT;
        paymentCurrency = approvedSubmission.applicationId.paymentCurrency || 
                         (approvedSubmission.applicationId.proposedRateNGN ? 'NGN' : 
                          approvedSubmission.applicationId.proposedRateUSDT ? 'USDT' : null);
      }
    }

    // Convert to plain object and add payment info
    const campaignWithPayment = campaign.toObject();
    campaignWithPayment.paymentAmount = paymentAmount;
    campaignWithPayment.paymentCurrency = paymentCurrency;

    res.json({ success: true, campaign: campaignWithPayment });
  } catch (err) {
    console.error('Error fetching campaign with submissions:', err);
    res.status(500).json({ error: 'Failed to load campaign data' });
  }
});
// routes/campaigns.js  →  POST /campaigns  handler
router.post(
  '/',
  requireAuth,
  requireAdvertiser, // only advertisers can create
  upload.single('thumbnail'),
  async (req, res) => {
    // ────────────────────────────────────────────────
    // Debug logging – very helpful when FormData fails
    // ────────────────────────────────────────────────
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║           CREATE CAMPAIGN REQUEST             ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('User ID:', req.user?._id?.toString());
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Has file?', !!req.file);
    if (req.file) {
      console.log('File info:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    }
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body sample:', JSON.stringify(req.body, null, 2).slice(0, 400) + '...');

    try {
      // ────────────────────────────────────────────────
      // Early validation
      // ────────────────────────────────────────────────
      if (!req.body.title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!req.body.description?.trim()) {
        return res.status(400).json({ error: 'Description is required' });
      }
      if (!req.body.category?.trim()) {
        return res.status(400).json({ error: 'Category is required' });
      }
      if (!req.body.applicationDeadline) {
        return res.status(400).json({ error: 'Application deadline is required' });
      }

      // Validate date
      const deadline = new Date(req.body.applicationDeadline);
      if (isNaN(deadline.getTime())) {
        return res.status(400).json({ error: 'Invalid application deadline format' });
      }
      if (deadline <= new Date()) {
        return res.status(400).json({ error: 'Application deadline must be in the future' });
      }

      // ────────────────────────────────────────────────
      // Parse JSON arrays safely
      // ────────────────────────────────────────────────
      let parsedKeyPhrases = [];
      let parsedRefLinks = [];

      if (req.body.keyPhrases) {
        try {
          parsedKeyPhrases = JSON.parse(req.body.keyPhrases);
          if (!Array.isArray(parsedKeyPhrases)) {
            parsedKeyPhrases = [];
          }
        } catch (e) {
          console.warn('Failed to parse keyPhrases:', e.message);
          // continue with empty array – don't fail creation
        }
      }

      if (req.body.referenceLinks) {
        try {
          parsedRefLinks = JSON.parse(req.body.referenceLinks);
          if (!Array.isArray(parsedRefLinks)) {
            parsedRefLinks = [];
          }
        } catch (e) {
          console.warn('Failed to parse referenceLinks:', e.message);
        }
      }

      // ────────────────────────────────────────────────
      // Build campaign document
      // ────────────────────────────────────────────────
      const campaignData = {
        advertiser: req.user._id,
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        script: (req.body.script || '').trim(),
        keyPhrases: parsedKeyPhrases,
        preferredLength: req.body.preferredLength || '30s',
        category: req.body.category.trim(),
        applicationDeadline: deadline,
        creativeDirection: {
          aspectRatio: req.body.aspectRatio || '9:16',
          preferredLocation: req.body.preferredLocation || 'anywhere',
          locationDescription: (req.body.locationDescription || '').trim(),
          backgroundStyle: (req.body.backgroundStyle || '').trim(),
          moodTone: (req.body.moodTone || '').trim(),
          referenceLinks: parsedRefLinks,
        },
      };

      if (req.file) {
        campaignData.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;
      }

      const campaign = new Campaign(campaignData);

      // Optional: run schema validations early
      await campaign.validate();

      await campaign.save();

      console.log('Campaign created successfully:', campaign._id.toString());

      // Optional: future notifications
      // await createNotificationForNewCampaign(campaign);

      return res.status(201).json({
        success: true,
        campaign: {
          _id: campaign._id,
          title: campaign.title,
          status: campaign.status,
          thumbnailUrl: campaign.thumbnailUrl,
          createdAt: campaign.createdAt,
        },
      });
    } catch (err) {
      console.error('Campaign creation failed:', {
        message: err.message,
        stack: err.stack?.slice(0, 300),
        name: err.name,
      });

      // Multer-specific errors
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }

      // Mongoose validation error
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // Generic fallback
      return res.status(500).json({
        error: 'Failed to create campaign',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);
// DELETE /api/campaigns/:id
router.delete('/:id', requireAuth, requireAdvertiser, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Safety: Only allow delete if status is cancelled
    if (campaign.status !== 'cancelled') {
      return res.status(403).json({ error: 'You can only delete a cancelled campaign' });
    }

    // Safety: Prevent delete if any clipper has been selected or is working
    const activeApplications = await Application.countDocuments({
      campaign: campaign._id,
      status: { $in: ['selected', 'accepted', 'submitted', 'revision_requested', 'approved'] }
    });

    if (activeApplications > 0) {
      return res.status(403).json({
        error: 'Cannot delete campaign. One or more clippers have already been selected or submitted work.'
      });
    }

    // Delete thumbnail file if exists
    if (campaign.thumbnailUrl) {
      const filePath = path.join(process.cwd(), campaign.thumbnailUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Campaign.deleteOne({ _id: campaign._id });

    res.json({ success: true, message: 'Campaign permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});
// ────────────────────────────────────────────────
//      GET MY CAMPAIGNS (advertiser only)
// ────────────────────────────────────────────────
router.get('/my', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ advertiser: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ────────────────────────────────────────────────
//      GET SINGLE CAMPAIGN (owner or public)
// ────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  // Guard: skip non-ObjectId slugs so /clipping, /my, etc. aren't caught here
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName company profileImage rating');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Optional: hide sensitive fields for non-owners
    if (campaign.advertiser.toString() !== req.user._id.toString()) {
      // you can remove script / private notes here if needed
    }

    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────
//      UPDATE CAMPAIGN (only draft)
// ────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdvertiser, upload.single('thumbnail'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'draft') {
      return res.status(403).json({ error: 'Can only edit draft campaigns' });
    }

    // Update fields if provided
    const updatable = [
      'title', 'description', 'script', 'keyPhrases', 'preferredLength',
      'category', 'applicationDeadline', 'creativeDirection'
    ];

    updatable.forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'keyPhrases' || key === 'creativeDirection.referenceLinks') {
          campaign[key] = JSON.parse(req.body[key]);
        } else if (key === 'applicationDeadline') {
          campaign[key] = new Date(req.body[key]);
        } else {
          campaign[key] = req.body[key];
        }
      }
    });

    if (req.file) {
      // delete old if exists
      if (campaign.thumbnailUrl) {
        // you can add fs.unlink logic here
      }
      campaign.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;
    }

    await campaign.save();
    res.json({ success: true, campaign });

  } catch (err) {
    res.status(400).json({ error: err.message || 'Update failed' });
  }
});

// ────────────────────────────────────────────────
//      ACTIVATE / CLOSE / CANCEL
// ────────────────────────────────────────────────
router.post('/:id/activate', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    await campaign.activate();
    res.json({ success: true, status: campaign.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/close', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const { reason } = req.body;
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    await campaign.close(reason);
    res.json({ success: true, status: campaign.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancel', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const { reason } = req.body;
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    await campaign.cancel(reason);
    res.json({ success: true, status: campaign.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




//////////////////////////////////////////////////////////////////////
// clipping campaign creation endpoint – this is separate from the main campaign creation because it has different fields and logic (like escrow handling)
///////////////////////////////////////////////////////////////////////
// Validation rules
const campaignValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('videoUrl')
    .trim()
    .isURL()
    .withMessage('Valid video URL is required'),
  
  body('budget')
    .isFloat({ min: 0.01 })
    .withMessage('Budget must be greater than 0'),
  
  body('currency')
    .isIn(['NGN', 'USDT'])
    .withMessage('Currency must be NGN or USDT'),
  
  body('platforms')
    .isArray({ min: 1 })
    .withMessage('At least one platform is required'),
  
  body('categories')
    .isArray({ min: 1 })
    .withMessage('At least one category is required'),
  
  body('costPerThousand')
    .isFloat({ min: 0 })
    .withMessage('Invalid cost per thousand'),
  
  body('estimatedViews')
    .isInt({ min: 1 })
    .withMessage('Invalid estimated views'),
];
// routes/campaigns.js - Modified clipping campaign creation without transactions

router.post('/clipping', requireAuth, campaignValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user._id;
    const {
      title,
      videoUrl,
      budget,
      currency,
      platforms,
      categories,
      hashtags,
      directions,
      ctaUrl,
      costPerThousand,
      estimatedViews,
    } = req.body;

    // Get user and wallet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is advertiser
    if (user.role !== 'advertiser' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only advertisers can create campaigns' });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check sufficient balance
    const availableBalance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
    if (budget > availableBalance) {
      return res.status(400).json({ error: `Insufficient ${currency} balance` });
    }

    // Lock funds in escrow
    if (currency === 'NGN') {
      await wallet.lockEscrowNGN(budget);
    } else {
      await wallet.lockEscrowUSDT(budget);
    }

    // Create campaign
    const campaign = new ClippingCampaign({
      advertiser: userId,
      title,
      videoUrl,
      budget,
      currency,
      costPerThousand,
      estimatedViews,
      platforms,
      categories,
      hashtags: hashtags || [],
      directions: directions || [],
      ctaUrl: ctaUrl || null,
      status: 'active',
    });

    await campaign.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'campaign_funding',
      amount: budget,
      currency,
      status: 'completed',
      reference: `CAMPAIGN_${campaign._id}`,
      metadata: {
        campaignId: campaign._id,
        campaignTitle: title,
      },
    });

    await transaction.save();

    // Update campaign with transaction reference
    campaign.escrowTransaction = transaction._id;
    await campaign.save();

    res.status(201).json({
      message: 'Campaign created successfully',
      campaignId: campaign._id,
      campaign,
    });

  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get user's clipping campaigns
router.get('/clipping', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { advertiser: userId };
    if (status) query.status = status;

    const campaigns = await ClippingCampaign.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('advertiser', 'firstName lastName email company');

    const total = await ClippingCampaign.countDocuments(query);

    res.json({
      campaigns,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/clipping/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await ClippingCampaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName email company');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if user owns the campaign or is admin
    if (campaign.advertiser._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Fetch campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});


// Cancel campaign and refund escrow
router.post('/clipping/:id/cancel', requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const campaign = await ClippingCampaign.findById(req.params.id).session(session);
    if (!campaign) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      await session.abortTransaction();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Campaign cannot be cancelled' });
    }

    // Calculate remaining budget
    const remainingBudget = campaign.budget - campaign.totalSpent;

    // Get wallet
    const wallet = await Wallet.findOne({ user: campaign.advertiser }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Release remaining funds from escrow
    if (remainingBudget > 0) {
      if (campaign.currency === 'NGN') {
        await wallet.releaseEscrowNGN(remainingBudget);
      } else {
        await wallet.releaseEscrowUSDT(remainingBudget);
      }
    }

    // Update campaign
    campaign.status = 'cancelled';
    campaign.cancelledAt = new Date();
    campaign.updatedAt = new Date();
    await campaign.save({ session });

    // Create refund transaction if there was money left
    if (remainingBudget > 0) {
      const refundTransaction = new Transaction({
        user: campaign.advertiser,
        type: 'campaign_refund',
        amount: remainingBudget,
        currency: campaign.currency,
        status: 'completed',
        reference: `REFUND_${campaign._id}`,
        metadata: {
          campaignId: campaign._id,
          campaignTitle: campaign.title,
        },
      });
      await refundTransaction.save({ session });
    }

    await session.commitTransaction();

    res.json({
      message: 'Campaign cancelled successfully',
      refundedAmount: remainingBudget,
      currency: campaign.currency,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel campaign error:', error);
    res.status(500).json({ error: 'Failed to cancel campaign' });
  } finally {
    session.endSession();
  }
});

/**
 * GET /api/campaigns/clipping/:id/submissions
 * All ClipSubmissions for a clipping campaign — advertiser & admin only.
 */
router.get('/clipping/:id/submissions', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid campaign ID.' });
    }

    const campaign = await ClippingCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    if (
      campaign.advertiser.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const submissions = await ClipSubmission.find({ campaign: req.params.id })
      .populate('clipper', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error('clipping submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});


export default router;
// // routes/campaigns.js
// import express from 'express';
// import multer from 'multer';
// import path from 'path';
// import Campaign from '../models/Campaign.js';
// import Application from '../models/Application.js';
// import Notification from '../models/Notification.js';
// import { requireAuth, requireAdvertiser } from '../middleware/auth.js'; // assume you have role middleware
// import { requireAdminAuth } from '../middleware/adminAuth.js';
// import fs from 'fs';

// import { body, validationResult } from 'express-validator';
// import mongoose from 'mongoose';
// import User from '../models/User.js';
// import Wallet from '../models/Wallet.js';
// import ClippingCampaign from '../models/ClippingCampaign.js';
// import Transaction from '../models/Transaction.js';


// const router = express.Router();
// // MULTER CONFIG – THUMBNAIL
// const uploadDir = path.join(process.cwd(), 'uploads/campaigns');

// // Make sure folder exists (redundant if you use the startup function, but safe)
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
//   console.log(`Ensured campaigns upload dir exists: ${uploadDir}`);
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, `${unique}${path.extname(file.originalname)}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
//   fileFilter: (req, file, cb) => {
//     const allowed = ['image/jpeg', 'image/png', 'image/webm', 'image/webp'];
//     if (allowed.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only JPEG, PNG, WEBP images allowed'), false);
//     }
//   },
// });

// // routes/campaigns.js - Add this new endpoint

// // GET /api/campaigns/:id/with-submissions
// router.get('/:id/with-submissions', requireAuth, async (req, res) => {
//   try {
//     const campaign = await Campaign.findById(req.params.id)
//       .populate('advertiser', 'firstName lastName company profileImage')
//       .populate('selectedClipper', 'firstName lastName profileImage rating')
//       .populate({
//         path: 'videoSubmissions.applicationId',
//         select: 'proposedRateNGN proposedRateUSDT paymentCurrency paymentAmount revisionCount status'
//       })
//       .populate({
//         path: 'videoSubmissions.clipperId',
//         select: 'firstName lastName profileImage rating'
//       });

//     if (!campaign) {
//       return res.status(404).json({ error: 'Campaign not found' });
//     }

//     // Check if user is the advertiser
//     if (campaign.advertiser._id.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     // Get the payment info from the approved/final application
//     let paymentAmount = null;
//     let paymentCurrency = null;
    
//     // First try to get from finalVideo's applicationId
//     if (campaign.finalVideo && campaign.finalVideo.applicationId) {
//       const finalApplication = campaign.videoSubmissions.find(function(sub) {
//         return sub.applicationId && sub.applicationId._id && 
//                sub.applicationId._id.toString() === campaign.finalVideo.applicationId.toString();
//       });
      
//       if (finalApplication && finalApplication.applicationId) {
//         paymentAmount = finalApplication.applicationId.paymentAmount || 
//                        finalApplication.applicationId.proposedRateNGN || 
//                        finalApplication.applicationId.proposedRateUSDT;
//         paymentCurrency = finalApplication.applicationId.paymentCurrency || 
//                          (finalApplication.applicationId.proposedRateNGN ? 'NGN' : 
//                           finalApplication.applicationId.proposedRateUSDT ? 'USDT' : null);
//       }
//     }
    
//     // If no payment from finalVideo, try the currentSubmission
//     if (!paymentAmount && campaign.currentSubmission) {
//       const currentApp = campaign.videoSubmissions.find(function(sub) {
//         return sub.applicationId && sub.applicationId._id && 
//                sub.applicationId._id.toString() === campaign.currentSubmission.toString();
//       });
      
//       if (currentApp && currentApp.applicationId) {
//         paymentAmount = currentApp.applicationId.paymentAmount || 
//                        currentApp.applicationId.proposedRateNGN || 
//                        currentApp.applicationId.proposedRateUSDT;
//         paymentCurrency = currentApp.applicationId.paymentCurrency || 
//                          (currentApp.applicationId.proposedRateNGN ? 'NGN' : 
//                           currentApp.applicationId.proposedRateUSDT ? 'USDT' : null);
//       }
//     }
    
//     // If still no payment, try the selectedClipper's application
//     if (!paymentAmount && campaign.selectedClipper) {
//       const clipperApp = campaign.videoSubmissions.find(function(sub) {
//         return sub.clipperId && sub.clipperId._id && 
//                sub.clipperId._id.toString() === campaign.selectedClipper.toString();
//       });
      
//       if (clipperApp && clipperApp.applicationId) {
//         paymentAmount = clipperApp.applicationId.paymentAmount || 
//                        clipperApp.applicationId.proposedRateNGN || 
//                        clipperApp.applicationId.proposedRateUSDT;
//         paymentCurrency = clipperApp.applicationId.paymentCurrency || 
//                          (clipperApp.applicationId.proposedRateNGN ? 'NGN' : 
//                           clipperApp.applicationId.proposedRateUSDT ? 'USDT' : null);
//       }
//     }

//     // Also check for approved submissions if we still don't have payment
//     if (!paymentAmount && campaign.videoSubmissions && campaign.videoSubmissions.length > 0) {
//       const approvedSubmission = campaign.videoSubmissions.find(function(sub) {
//         return sub.status === 'approved' && sub.applicationId;
//       });
      
//       if (approvedSubmission && approvedSubmission.applicationId) {
//         paymentAmount = approvedSubmission.applicationId.paymentAmount || 
//                        approvedSubmission.applicationId.proposedRateNGN || 
//                        approvedSubmission.applicationId.proposedRateUSDT;
//         paymentCurrency = approvedSubmission.applicationId.paymentCurrency || 
//                          (approvedSubmission.applicationId.proposedRateNGN ? 'NGN' : 
//                           approvedSubmission.applicationId.proposedRateUSDT ? 'USDT' : null);
//       }
//     }

//     // Convert to plain object and add payment info
//     const campaignWithPayment = campaign.toObject();
//     campaignWithPayment.paymentAmount = paymentAmount;
//     campaignWithPayment.paymentCurrency = paymentCurrency;

//     res.json({ success: true, campaign: campaignWithPayment });
//   } catch (err) {
//     console.error('Error fetching campaign with submissions:', err);
//     res.status(500).json({ error: 'Failed to load campaign data' });
//   }
// });
// // routes/campaigns.js  →  POST /campaigns  handler
// router.post(
//   '/',
//   requireAuth,
//   requireAdvertiser, // only advertisers can create
//   upload.single('thumbnail'),
//   async (req, res) => {
//     // ────────────────────────────────────────────────
//     // Debug logging – very helpful when FormData fails
//     // ────────────────────────────────────────────────
//     console.log('╔═══════════════════════════════════════════════╗');
//     console.log('║           CREATE CAMPAIGN REQUEST             ║');
//     console.log('╚═══════════════════════════════════════════════╝');
//     console.log('User ID:', req.user?._id?.toString());
//     console.log('Content-Type:', req.headers['content-type']);
//     console.log('Has file?', !!req.file);
//     if (req.file) {
//       console.log('File info:', {
//         originalname: req.file.originalname,
//         filename: req.file.filename,
//         size: req.file.size,
//         mimetype: req.file.mimetype,
//       });
//     }
//     console.log('Body keys:', Object.keys(req.body));
//     console.log('Body sample:', JSON.stringify(req.body, null, 2).slice(0, 400) + '...');

//     try {
//       // ────────────────────────────────────────────────
//       // Early validation
//       // ────────────────────────────────────────────────
//       if (!req.body.title?.trim()) {
//         return res.status(400).json({ error: 'Title is required' });
//       }
//       if (!req.body.description?.trim()) {
//         return res.status(400).json({ error: 'Description is required' });
//       }
//       if (!req.body.category?.trim()) {
//         return res.status(400).json({ error: 'Category is required' });
//       }
//       if (!req.body.applicationDeadline) {
//         return res.status(400).json({ error: 'Application deadline is required' });
//       }

//       // Validate date
//       const deadline = new Date(req.body.applicationDeadline);
//       if (isNaN(deadline.getTime())) {
//         return res.status(400).json({ error: 'Invalid application deadline format' });
//       }
//       if (deadline <= new Date()) {
//         return res.status(400).json({ error: 'Application deadline must be in the future' });
//       }

//       // ────────────────────────────────────────────────
//       // Parse JSON arrays safely
//       // ────────────────────────────────────────────────
//       let parsedKeyPhrases = [];
//       let parsedRefLinks = [];

//       if (req.body.keyPhrases) {
//         try {
//           parsedKeyPhrases = JSON.parse(req.body.keyPhrases);
//           if (!Array.isArray(parsedKeyPhrases)) {
//             parsedKeyPhrases = [];
//           }
//         } catch (e) {
//           console.warn('Failed to parse keyPhrases:', e.message);
//           // continue with empty array – don't fail creation
//         }
//       }

//       if (req.body.referenceLinks) {
//         try {
//           parsedRefLinks = JSON.parse(req.body.referenceLinks);
//           if (!Array.isArray(parsedRefLinks)) {
//             parsedRefLinks = [];
//           }
//         } catch (e) {
//           console.warn('Failed to parse referenceLinks:', e.message);
//         }
//       }

//       // ────────────────────────────────────────────────
//       // Build campaign document
//       // ────────────────────────────────────────────────
//       const campaignData = {
//         advertiser: req.user._id,
//         title: req.body.title.trim(),
//         description: req.body.description.trim(),
//         script: (req.body.script || '').trim(),
//         keyPhrases: parsedKeyPhrases,
//         preferredLength: req.body.preferredLength || '30s',
//         category: req.body.category.trim(),
//         applicationDeadline: deadline,
//         creativeDirection: {
//           aspectRatio: req.body.aspectRatio || '9:16',
//           preferredLocation: req.body.preferredLocation || 'anywhere',
//           locationDescription: (req.body.locationDescription || '').trim(),
//           backgroundStyle: (req.body.backgroundStyle || '').trim(),
//           moodTone: (req.body.moodTone || '').trim(),
//           referenceLinks: parsedRefLinks,
//         },
//       };

//       if (req.file) {
//         campaignData.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;
//       }

//       const campaign = new Campaign(campaignData);

//       // Optional: run schema validations early
//       await campaign.validate();

//       await campaign.save();

//       console.log('Campaign created successfully:', campaign._id.toString());

//       // Optional: future notifications
//       // await createNotificationForNewCampaign(campaign);

//       return res.status(201).json({
//         success: true,
//         campaign: {
//           _id: campaign._id,
//           title: campaign.title,
//           status: campaign.status,
//           thumbnailUrl: campaign.thumbnailUrl,
//           createdAt: campaign.createdAt,
//         },
//       });
//     } catch (err) {
//       console.error('Campaign creation failed:', {
//         message: err.message,
//         stack: err.stack?.slice(0, 300),
//         name: err.name,
//       });

//       // Multer-specific errors
//       if (err instanceof multer.MulterError) {
//         return res.status(400).json({ error: `File upload error: ${err.message}` });
//       }

//       // Mongoose validation error
//       if (err.name === 'ValidationError') {
//         const errors = Object.values(err.errors).map((e) => e.message);
//         return res.status(400).json({ error: 'Validation failed', details: errors });
//       }

//       // Generic fallback
//       return res.status(500).json({
//         error: 'Failed to create campaign',
//         message: process.env.NODE_ENV === 'development' ? err.message : undefined,
//       });
//     }
//   }
// );
// // DELETE /api/campaigns/:id
// router.delete('/:id', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const campaign = await Campaign.findOne({
//       _id: req.params.id,
//       advertiser: req.user._id
//     });

//     if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

//     // Safety: Only allow delete if status is cancelled
//     if (campaign.status !== 'cancelled') {
//       return res.status(403).json({ error: 'You can only delete a cancelled campaign' });
//     }

//     // Safety: Prevent delete if any clipper has been selected or is working
//     const activeApplications = await Application.countDocuments({
//       campaign: campaign._id,
//       status: { $in: ['selected', 'accepted', 'submitted', 'revision_requested', 'approved'] }
//     });

//     if (activeApplications > 0) {
//       return res.status(403).json({
//         error: 'Cannot delete campaign. One or more clippers have already been selected or submitted work.'
//       });
//     }

//     // Delete thumbnail file if exists
//     if (campaign.thumbnailUrl) {
//       const filePath = path.join(process.cwd(), campaign.thumbnailUrl);
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//     }

//     await Campaign.deleteOne({ _id: campaign._id });

//     res.json({ success: true, message: 'Campaign permanently deleted' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to delete campaign' });
//   }
// });
// // ────────────────────────────────────────────────
// //      GET MY CAMPAIGNS (advertiser only)
// // ────────────────────────────────────────────────
// router.get('/my', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const campaigns = await Campaign.find({ advertiser: req.user._id })
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json({ success: true, campaigns });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch campaigns' });
//   }
// });

// // ────────────────────────────────────────────────
// //      GET SINGLE CAMPAIGN (owner or public)
// // ────────────────────────────────────────────────
// router.get('/:id', requireAuth, async (req, res) => {
//   try {
//     const campaign = await Campaign.findById(req.params.id)
//       .populate('advertiser', 'firstName lastName company profileImage rating');

//     if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

//     // Optional: hide sensitive fields for non-owners
//     if (campaign.advertiser.toString() !== req.user._id.toString()) {
//       // you can remove script / private notes here if needed
//     }

//     res.json({ success: true, campaign });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // ────────────────────────────────────────────────
// //      UPDATE CAMPAIGN (only draft)
// // ────────────────────────────────────────────────
// router.patch('/:id', requireAuth, requireAdvertiser, upload.single('thumbnail'), async (req, res) => {
//   try {
//     const campaign = await Campaign.findOne({
//       _id: req.params.id,
//       advertiser: req.user._id
//     });

//     if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
//     if (campaign.status !== 'draft') {
//       return res.status(403).json({ error: 'Can only edit draft campaigns' });
//     }

//     // Update fields if provided
//     const updatable = [
//       'title', 'description', 'script', 'keyPhrases', 'preferredLength',
//       'category', 'applicationDeadline', 'creativeDirection'
//     ];

//     updatable.forEach(key => {
//       if (req.body[key] !== undefined) {
//         if (key === 'keyPhrases' || key === 'creativeDirection.referenceLinks') {
//           campaign[key] = JSON.parse(req.body[key]);
//         } else if (key === 'applicationDeadline') {
//           campaign[key] = new Date(req.body[key]);
//         } else {
//           campaign[key] = req.body[key];
//         }
//       }
//     });

//     if (req.file) {
//       // delete old if exists
//       if (campaign.thumbnailUrl) {
//         // you can add fs.unlink logic here
//       }
//       campaign.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;
//     }

//     await campaign.save();
//     res.json({ success: true, campaign });

//   } catch (err) {
//     res.status(400).json({ error: err.message || 'Update failed' });
//   }
// });

// // ────────────────────────────────────────────────
// //      ACTIVATE / CLOSE / CANCEL
// // ────────────────────────────────────────────────
// router.post('/:id/activate', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const campaign = await Campaign.findOne({
//       _id: req.params.id,
//       advertiser: req.user._id
//     });
//     if (!campaign) return res.status(404).json({ error: 'Not found' });

//     await campaign.activate();
//     res.json({ success: true, status: campaign.status });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// router.post('/:id/close', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const { reason } = req.body;
//     const campaign = await Campaign.findOne({
//       _id: req.params.id,
//       advertiser: req.user._id
//     });
//     if (!campaign) return res.status(404).json({ error: 'Not found' });

//     await campaign.close(reason);
//     res.json({ success: true, status: campaign.status });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// router.post('/:id/cancel', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const { reason } = req.body;
//     const campaign = await Campaign.findOne({
//       _id: req.params.id,
//       advertiser: req.user._id
//     });
//     if (!campaign) return res.status(404).json({ error: 'Not found' });

//     await campaign.cancel(reason);
//     res.json({ success: true, status: campaign.status });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });




// //////////////////////////////////////////////////////////////////////
// // clipping campaign creation endpoint – this is separate from the main campaign creation because it has different fields and logic (like escrow handling)
// ///////////////////////////////////////////////////////////////////////
// // Validation rules
// const campaignValidation = [
//   body('title')
//     .trim()
//     .isLength({ min: 5, max: 100 })
//     .withMessage('Title must be between 5 and 100 characters'),
  
//   body('videoUrl')
//     .trim()
//     .isURL()
//     .withMessage('Valid video URL is required'),
  
//   body('budget')
//     .isFloat({ min: 0.01 })
//     .withMessage('Budget must be greater than 0'),
  
//   body('currency')
//     .isIn(['NGN', 'USDT'])
//     .withMessage('Currency must be NGN or USDT'),
  
//   body('platforms')
//     .isArray({ min: 1 })
//     .withMessage('At least one platform is required'),
  
//   body('categories')
//     .isArray({ min: 1 })
//     .withMessage('At least one category is required'),
  
//   body('costPerThousand')
//     .isFloat({ min: 0 })
//     .withMessage('Invalid cost per thousand'),
  
//   body('estimatedViews')
//     .isInt({ min: 1 })
//     .withMessage('Invalid estimated views'),
// ];
// // routes/campaigns.js - Modified clipping campaign creation without transactions

// router.post('/clipping', requireAuth, campaignValidation, async (req, res) => {
//   try {
//     // Check validation errors
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const userId = req.user.id;
//     const {
//       title,
//       videoUrl,
//       budget,
//       currency,
//       platforms,
//       categories,
//       hashtags,
//       directions,
//       ctaUrl,
//       costPerThousand,
//       estimatedViews,
//     } = req.body;

//     // Get user and wallet
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Check if user is advertiser
//     if (user.role !== 'advertiser' && user.role !== 'admin') {
//       return res.status(403).json({ error: 'Only advertisers can create campaigns' });
//     }

//     // Get wallet
//     const wallet = await Wallet.findOne({ user: userId });
//     if (!wallet) {
//       return res.status(404).json({ error: 'Wallet not found' });
//     }

//     // Check sufficient balance
//     const availableBalance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
//     if (budget > availableBalance) {
//       return res.status(400).json({ error: `Insufficient ${currency} balance` });
//     }

//     // Lock funds in escrow
//     if (currency === 'NGN') {
//       await wallet.lockEscrowNGN(budget);
//     } else {
//       await wallet.lockEscrowUSDT(budget);
//     }

//     // Create campaign
//     const campaign = new ClippingCampaign({
//       advertiser: userId,
//       title,
//       videoUrl,
//       budget,
//       currency,
//       costPerThousand,
//       estimatedViews,
//       platforms,
//       categories,
//       hashtags: hashtags || [],
//       directions: directions || [],
//       ctaUrl: ctaUrl || null,
//       status: 'active',
//     });

//     await campaign.save();

//     // Create transaction record
//     const transaction = new Transaction({
//       user: userId,
//       type: 'campaign_funding',
//       amount: budget,
//       currency,
//       status: 'completed',
//       reference: `CAMPAIGN_${campaign._id}`,
//       metadata: {
//         campaignId: campaign._id,
//         campaignTitle: title,
//       },
//     });

//     await transaction.save();

//     // Update campaign with transaction reference
//     campaign.escrowTransaction = transaction._id;
//     await campaign.save();

//     res.status(201).json({
//       message: 'Campaign created successfully',
//       campaignId: campaign._id,
//       campaign,
//     });

//   } catch (error) {
//     console.error('Campaign creation error:', error);
//     res.status(500).json({ error: 'Failed to create campaign' });
//   }
// });

// // Get user's clipping campaigns
// router.get('/clipping', requireAuth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { status, page = 1, limit = 10 } = req.query;

//     // Build query
//     const query = { advertiser: userId };
//     if (status) query.status = status;

//     const campaigns = await ClippingCampaign.find(query)
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit) * 1)
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .populate('advertiser', 'firstName lastName email company');

//     const total = await ClippingCampaign.countDocuments(query);

//     res.json({
//       campaigns,
//       totalPages: Math.ceil(total / parseInt(limit)),
//       currentPage: parseInt(page),
//       total,
//     });
//   } catch (error) {
//     console.error('Fetch campaigns error:', error);
//     res.status(500).json({ error: 'Failed to fetch campaigns' });
//   }
// });

// // Get single campaign
// router.get('/clipping/:id', requireAuth, async (req, res) => {
//   try {
//     const campaign = await ClippingCampaign.findById(req.params.id)
//       .populate('advertiser', 'firstName lastName email company');

//     if (!campaign) {
//       return res.status(404).json({ error: 'Campaign not found' });
//     }

//     // Check if user owns the campaign or is admin
//     if (campaign.advertiser._id.toString() !== req.user.id && req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }

//     res.json(campaign);
//   } catch (error) {
//     console.error('Fetch campaign error:', error);
//     res.status(500).json({ error: 'Failed to fetch campaign' });
//   }
// });


// // Cancel campaign and refund escrow
// router.post('/clipping/:id/cancel', requireAuth, async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const campaign = await ClippingCampaign.findById(req.params.id).session(session);
//     if (!campaign) {
//       await session.abortTransaction();
//       return res.status(404).json({ error: 'Campaign not found' });
//     }

//     // Check ownership
//     if (campaign.advertiser.toString() !== req.user.id && req.user.role !== 'admin') {
//       await session.abortTransaction();
//       return res.status(403).json({ error: 'Unauthorized' });
//     }

//     if (campaign.status === 'completed' || campaign.status === 'cancelled') {
//       await session.abortTransaction();
//       return res.status(400).json({ error: 'Campaign cannot be cancelled' });
//     }

//     // Calculate remaining budget
//     const remainingBudget = campaign.budget - campaign.totalSpent;

//     // Get wallet
//     const wallet = await Wallet.findOne({ user: campaign.advertiser }).session(session);
//     if (!wallet) {
//       await session.abortTransaction();
//       return res.status(404).json({ error: 'Wallet not found' });
//     }

//     // Release remaining funds from escrow
//     if (remainingBudget > 0) {
//       if (campaign.currency === 'NGN') {
//         await wallet.releaseEscrowNGN(remainingBudget);
//       } else {
//         await wallet.releaseEscrowUSDT(remainingBudget);
//       }
//     }

//     // Update campaign
//     campaign.status = 'cancelled';
//     campaign.cancelledAt = new Date();
//     campaign.updatedAt = new Date();
//     await campaign.save({ session });

//     // Create refund transaction if there was money left
//     if (remainingBudget > 0) {
//       const refundTransaction = new Transaction({
//         user: campaign.advertiser,
//         type: 'campaign_refund',
//         amount: remainingBudget,
//         currency: campaign.currency,
//         status: 'completed',
//         reference: `REFUND_${campaign._id}`,
//         metadata: {
//           campaignId: campaign._id,
//           campaignTitle: campaign.title,
//         },
//       });
//       await refundTransaction.save({ session });
//     }

//     await session.commitTransaction();

//     res.json({
//       message: 'Campaign cancelled successfully',
//       refundedAmount: remainingBudget,
//       currency: campaign.currency,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error('Cancel campaign error:', error);
//     res.status(500).json({ error: 'Failed to cancel campaign' });
//   } finally {
//     session.endSession();
//   }
// });


// export default router;