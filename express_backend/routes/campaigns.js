// routes/campaigns.js
// KEY CHANGES:
//  1. POST / creates campaign with status:'pending_approval' (not 'draft')
//  2. POST /:id/submit-for-review  — advertiser resubmits after adworker rejection (draft → pending_approval)
//  3. POST /:id/go-live            — adworker approves the campaign (pending_approval → active)
//  4. POST /:id/reject-by-adworker — adworker rejects with note (pending_approval → draft)
//  5. POST /:id/complete           — advertiser marks job done → auto-pays clipper from escrow
//  6. GET /adworker/pending        — adworker list of pending UGC campaigns to review
//  7. Auto-payment runs in releaseEscrowToClipper() helper used by both manual & deadline paths
//
import express from 'express';
import multer from 'multer';
import path from 'path';
import Campaign from '../models/Campaign.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireAdvertiser } from '../middleware/auth.js';
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

// ─── Multer ───────────────────────────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads/campaigns');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webm','image/webp'].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only JPEG, PNG, WEBP images allowed'), false);
  },
});

// ─── Helper: release escrow → clipper + platform ─────────────────────────────
// Used by both: advertiser "Mark Complete" and the auto-deadline checker.
// The paymentReleased flag on Campaign is the idempotency guard — safe to call twice.
async function releaseEscrowToClipper(campaign, application) {
  if (campaign.paymentReleased) return; // already paid — no double-pay

  const amount   = application.paymentAmount;
  const currency = application.paymentCurrency;
  const isNGN    = currency === 'NGN';

  const [advertiserWallet, clipperWallet] = await Promise.all([
    Wallet.findOne({ user: campaign.advertiser }),
    Wallet.findOne({ user: application.clipper }),
  ]);

  if (!advertiserWallet) throw new Error('Advertiser wallet not found');

  // Deduct escrow from advertiser
  if (isNGN) {
    const deduct = Math.min(amount, advertiserWallet.escrowLocked || 0);
    advertiserWallet.escrowLocked = (advertiserWallet.escrowLocked || 0) - deduct;
  } else {
    const deduct = Math.min(amount, advertiserWallet.usdtEscrowLocked || 0);
    advertiserWallet.usdtEscrowLocked = (advertiserWallet.usdtEscrowLocked || 0) - deduct;
  }
  await advertiserWallet.save();

  // Credit clipper
  let cw = clipperWallet;
  if (!cw) cw = await Wallet.create({ user: application.clipper, balance: 0, usdtBalance: 0 });

  if (isNGN) cw.balance = (cw.balance || 0) + amount;
  else cw.usdtBalance   = (cw.usdtBalance || 0) + amount;
  await cw.save();

  // Transactions
  await Transaction.create({
    user: application.clipper,
    type: 'payment',
    amount, currency, status: 'completed',
    reference: `ugc:payout:${application._id}`,
    description: `UGC payment for "${campaign.title}"`,
  });

  await Transaction.create({
    user: campaign.advertiser,
    type: 'payment',
    amount, currency, status: 'completed',
    reference: `ugc:escrow-release:${application._id}`,
    description: `Escrow released for "${campaign.title}"`,
  });

  // Mark paid
  campaign.paymentReleased = true;
  application.escrowReleased = true;
  application.completedAt = new Date();
  application.status = 'approved';

  // Notify clipper
  try {
    await Notification.create({
      user: application.clipper,
      type: 'payment_received',
      title: '💰 Payment Received!',
      message: `Your UGC for "${campaign.title}" has been completed. ${isNGN ? '₦' : '$'}${amount} credited to your wallet.`,
      priority: 'high',
    });
  } catch (_) {}
}

// ─── GET /adworker/pending  ───────────────────────────────────────────────────
// Adworker sees all UGC campaigns waiting for review
router.get('/adworker/pending', requireAuth, async (req, res) => {
  if (!['admin', 'adworker'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Adworker or admin access required' });
  }
  try {
    const { status = 'pending_approval', page = 1, limit = 20, search = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .populate('advertiser', 'firstName lastName email company profileImage')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    res.json({ campaigns, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ─── POST /:id/go-live  ───────────────────────────────────────────────────────
// Adworker approves the UGC campaign → makes it live for clippers to apply
router.post('/:id/go-live', requireAuth, async (req, res) => {
  if (!['admin', 'adworker'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Adworker or admin access required' });
  }
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { note = '' } = req.body;
    await campaign.goLive(note);

    // Notify advertiser
    await Notification.create({
      user: campaign.advertiser,
      type: 'campaign_approved',
      title: '✅ Campaign Approved & Live!',
      message: `Your UGC campaign "${campaign.title}" has been reviewed and is now live. Creators can start applying!`,
      priority: 'high',
    });

    res.json({ success: true, message: 'Campaign is now live!', status: campaign.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:id/reject-by-adworker  ───────────────────────────────────────────
// Adworker rejects the UGC campaign with a note → back to draft
router.post('/:id/reject-by-adworker', requireAuth, async (req, res) => {
  if (!['admin', 'adworker'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Adworker or admin access required' });
  }
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'Please provide a rejection reason' });

    await campaign.rejectByAdworker(note.trim());

    // Notify advertiser
    await Notification.create({
      user: campaign.advertiser,
      type: 'campaign_rejected',
      title: '⚠️ Campaign Needs Changes',
      message: `Your UGC campaign "${campaign.title}" needs changes before it can go live. Reason: ${note.trim()}`,
      priority: 'high',
    });

    res.json({ success: true, message: 'Campaign rejected. Advertiser notified.', adworkerNote: note });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:id/submit-for-review  ─────────────────────────────────────────────
// Advertiser resubmits after adworker rejection (draft → pending_approval)
router.post('/:id/submit-for-review', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    await campaign.submitForReview();
    res.json({ success: true, message: 'Submitted for adworker review!', status: campaign.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:id/complete  ──────────────────────────────────────────────────────
// Advertiser clicks "Accept & Complete" after reviewing the submitted video.
// Triggers auto-payment from escrow to clipper.
router.post('/:id/complete', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const completable = ['video_submitted','revision_submitted','revision_requested','closed','active'];
    if (!completable.includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot complete from status: ${campaign.status}` });
    }
    if (campaign.paymentReleased) {
      return res.status(400).json({ error: 'Payment already released for this campaign' });
    }

    // Find the accepted application with a submitted video
    const application = await Application.findOne({
      campaign: campaign._id,
      status: { $in: ['submitted','revision_requested','accepted'] },
    }).populate('clipper campaign');

    if (!application) {
      return res.status(400).json({ error: 'No active application found to pay. Has the creator submitted a video?' });
    }
    if (!application.paymentAmount) {
      return res.status(400).json({ error: 'Payment amount not set on application' });
    }

    // Release escrow → clipper
    await releaseEscrowToClipper(campaign, application);
    await application.save();
    await campaign.markCompleted();
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign completed! ${application.paymentCurrency === 'NGN' ? '₦' : '$'}${application.paymentAmount} paid to creator.`,
    });
  } catch (err) {
    console.error('complete error:', err);
    res.status(500).json({ error: err.message || 'Could not complete campaign' });
  }
});

// ─── GET /with-submissions/:id  ──────────────────────────────────────────────
router.get('/:id/with-submissions', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName company profileImage')
      .populate('selectedClipper', 'firstName lastName profileImage rating')
      .populate({ path: 'videoSubmissions.applicationId', select: 'proposedRateNGN proposedRateUSDT paymentCurrency paymentAmount revisionCount status' })
      .populate({ path: 'videoSubmissions.clipperId', select: 'firstName lastName profileImage rating' });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.advertiser._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Derive payment info from application
    const acceptedApp = await Application.findOne({
      campaign: campaign._id,
      status: { $in: ['submitted','approved','accepted','revision_requested'] },
    }).select('paymentAmount paymentCurrency proposedRateNGN proposedRateUSDT');

    const result = campaign.toObject();
    result.paymentAmount   = acceptedApp?.paymentAmount || acceptedApp?.proposedRateNGN || acceptedApp?.proposedRateUSDT;
    result.paymentCurrency = acceptedApp?.paymentCurrency || (acceptedApp?.proposedRateNGN ? 'NGN' : 'USDT');

    res.json({ success: true, campaign: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load campaign data' });
  }
});

// ─── POST /  (create campaign)  ───────────────────────────────────────────────
// Defaults to pending_approval (not draft or active)
router.post('/', requireAuth, requireAdvertiser, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.body.title?.trim())               return res.status(400).json({ error: 'Title is required' });
    if (!req.body.description?.trim())         return res.status(400).json({ error: 'Description is required' });
    if (!req.body.category?.trim())            return res.status(400).json({ error: 'Category is required' });
    if (!req.body.applicationDeadline)         return res.status(400).json({ error: 'Application deadline is required' });

    const deadline = new Date(req.body.applicationDeadline);
    if (isNaN(deadline.getTime()))             return res.status(400).json({ error: 'Invalid deadline format' });
    if (deadline <= new Date())               return res.status(400).json({ error: 'Deadline must be in the future' });

    let parsedKeyPhrases = [];
    let parsedRefLinks   = [];
    try { parsedKeyPhrases = JSON.parse(req.body.keyPhrases || '[]'); } catch (_) {}
    try { parsedRefLinks   = JSON.parse(req.body.referenceLinks || '[]'); } catch (_) {}

    const data = {
      advertiser:   req.user._id,
      title:        req.body.title.trim(),
      description:  req.body.description.trim(),
      script:       (req.body.script || '').trim(),
      keyPhrases:   parsedKeyPhrases,
      preferredLength: req.body.preferredLength || '30s',
      category:     req.body.category.trim(),
      applicationDeadline: deadline,
      // pending_approval requires the updated Campaign model.
      // If the model still has the old enum, fall back to 'draft' so save doesn't fail.
      // After updating models/Campaign.js this will correctly use 'pending_approval'.
      status: 'pending_approval',
      creativeDirection: {
        aspectRatio:         req.body.aspectRatio || '9:16',
        preferredLocation:   req.body.preferredLocation || 'anywhere',
        locationDescription: (req.body.locationDescription || '').trim(),
        backgroundStyle:     (req.body.backgroundStyle || '').trim(),
        moodTone:            (req.body.moodTone || '').trim(),
        referenceLinks:      parsedRefLinks,
      },
    };
    if (req.file) data.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;

    // Check if Campaign schema supports pending_approval status
    const enumValues = Campaign.schema.path('status')?.enumValues || [];
    if (!enumValues.includes('pending_approval')) {
      // Old model on disk — use 'draft' as fallback so the save doesn't throw
      console.warn('[campaigns] Campaign model missing pending_approval enum. Using draft as fallback. Please update models/Campaign.js');
      data.status = 'draft';
    }

    const campaign = new Campaign(data);
    await campaign.validate();
    await campaign.save();

    // Notify adworkers about new pending campaign
    const adworkers = await User.find({ role: { $in: ['adworker','admin'] } }).select('_id').lean();
    if (adworkers.length) {
      await Notification.insertMany(adworkers.map((aw) => ({
        user: aw._id,
        type: 'new_ugc_pending',
        title: '🆕 UGC Campaign Pending Review',
        message: `New UGC campaign "${campaign.title}" needs your review before going live.`,
        data: { campaignId: campaign._id },
        priority: 'high',
      })));
    }

    return res.status(201).json({
      success: true,
      campaign: { _id: campaign._id, title: campaign.title, status: campaign.status, createdAt: campaign.createdAt },
    });
  } catch (err) {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `File error: ${err.message}` });
    if (err.name === 'ValidationError') {
      const details = Object.entries(err.errors).map(([field, e]) => `${field}: ${e.message}`);
      console.error('Campaign validation error:', details);
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error('Campaign creation failed:', err.message);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ─── DELETE /:id  ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdvertiser, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!['cancelled','draft','pending_approval'].includes(campaign.status)) {
      return res.status(403).json({ error: 'Can only delete draft, pending, or cancelled campaigns' });
    }
    if (campaign.thumbnailUrl) {
      const fp = path.join(process.cwd(), campaign.thumbnailUrl);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await Campaign.deleteOne({ _id: campaign._id });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// ─── GET /my  ─────────────────────────────────────────────────────────────────
router.get('/my', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ advertiser: req.user._id })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ─── GET /:id  ────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName company profileImage rating');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /:id  ──────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdvertiser, upload.single('thumbnail'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!['draft','pending_approval'].includes(campaign.status)) {
      return res.status(403).json({ error: 'Can only edit draft or pending campaigns' });
    }
    const fields = ['title','description','script','keyPhrases','preferredLength','category','applicationDeadline'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === 'keyPhrases') { try { campaign[key] = JSON.parse(req.body[key]); } catch (_) {} }
        else if (key === 'applicationDeadline') campaign[key] = new Date(req.body[key]);
        else campaign[key] = req.body[key];
      }
    });
    if (req.file) campaign.thumbnailUrl = `/uploads/campaigns/${req.file.filename}`;
    await campaign.save();
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Update failed' });
  }
});

// ─── POST /:id/close  ─────────────────────────────────────────────────────────
router.post('/:id/close', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    await campaign.close(req.body.reason);
    res.json({ success: true, status: campaign.status });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── POST /:id/cancel  ───────────────────────────────────────────────────────
router.post('/:id/cancel', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, advertiser: req.user._id });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    await campaign.cancel(req.body.reason);
    res.json({ success: true, status: campaign.status });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── Clipping routes (unchanged below) ───────────────────────────────────────

const campaignValidation = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 chars'),
  body('videoUrl').trim().isURL().withMessage('Valid video URL required'),
  body('budget').isFloat({ min: 0.01 }).withMessage('Budget must be > 0'),
  body('currency').isIn(['NGN','USDT']).withMessage('Currency must be NGN or USDT'),
  body('platforms').isArray({ min: 1 }).withMessage('At least one platform required'),
  body('categories').isArray({ min: 1 }).withMessage('At least one category required'),
  body('costPerThousand').isFloat({ min: 0 }).withMessage('Invalid CPM'),
  body('estimatedViews').isInt({ min: 1 }).withMessage('Invalid estimated views'),
];

router.post('/clipping', requireAuth, campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user._id;
    const { title, videoUrl, budget, currency, platforms, categories, hashtags, directions, ctaUrl, costPerThousand, estimatedViews } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!['advertiser','admin'].includes(user.role)) return res.status(403).json({ error: 'Only advertisers can create campaigns' });

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const available = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
    if (budget > available) return res.status(400).json({ error: `Insufficient ${currency} balance` });

    if (currency === 'NGN') await wallet.lockEscrowNGN(budget);
    else await wallet.lockEscrowUSDT(budget);

    const campaign = new ClippingCampaign({
      advertiser: userId, title, videoUrl, budget, currency,
      costPerThousand, estimatedViews, platforms, categories,
      hashtags: hashtags || [], directions: directions || [],
      ctaUrl: ctaUrl || null, status: 'active',
    });
    await campaign.save();

    const transaction = new Transaction({
      user: userId, type: 'campaign_funding', amount: budget, currency,
      status: 'completed', reference: `CAMPAIGN_${campaign._id}`,
      description: `Clipping campaign funded: ${title}`,
    });
    await transaction.save();

    campaign.escrowTransaction = transaction._id;
    await campaign.save();

    res.status(201).json({ message: 'Campaign created successfully', campaignId: campaign._id, campaign });
  } catch (error) {
    console.error('Clipping campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.get('/clipping', requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { advertiser: req.user._id };
    if (status) query.status = status;
    const campaigns = await ClippingCampaign.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('advertiser', 'firstName lastName email company');
    const total = await ClippingCampaign.countDocuments(query);
    res.json({ campaigns, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page), total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/clipping/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await ClippingCampaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName email company');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.advertiser._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/clipping/:id/cancel', requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const campaign = await ClippingCampaign.findById(req.params.id).session(session);
    if (!campaign) { await session.abortTransaction(); return res.status(404).json({ error: 'Not found' }); }
    if (campaign.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      await session.abortTransaction(); return res.status(403).json({ error: 'Unauthorized' });
    }
    if (['completed','cancelled'].includes(campaign.status)) {
      await session.abortTransaction(); return res.status(400).json({ error: 'Cannot cancel' });
    }
    const remaining = campaign.budget - campaign.totalSpent;
    const wallet = await Wallet.findOne({ user: campaign.advertiser }).session(session);
    if (!wallet) { await session.abortTransaction(); return res.status(404).json({ error: 'Wallet not found' }); }
    if (remaining > 0) {
      if (campaign.currency === 'NGN') await wallet.releaseEscrowNGN(remaining);
      else await wallet.releaseEscrowUSDT(remaining);
    }
    campaign.status = 'cancelled'; campaign.cancelledAt = new Date();
    await campaign.save({ session });
    if (remaining > 0) {
      await new Transaction({
        user: campaign.advertiser, type: 'refund', amount: remaining, currency: campaign.currency,
        status: 'completed', reference: `REFUND_${campaign._id}`,
        description: `Clipping campaign cancelled refund: ${campaign.title}`,
      }).save({ session });
    }
    await session.commitTransaction();
    res.json({ message: 'Campaign cancelled', refundedAmount: remaining, currency: campaign.currency });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: 'Failed to cancel campaign' });
  } finally {
    session.endSession();
  }
});

router.get('/clipping/:id/submissions', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    const campaign = await ClippingCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    if (campaign.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const submissions = await ClipSubmission.find({ campaign: req.params.id })
      .populate('clipper', 'firstName lastName email').sort({ createdAt: -1 }).lean();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export { releaseEscrowToClipper };
export default router;
