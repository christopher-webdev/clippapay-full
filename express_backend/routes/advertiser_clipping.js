// routes/advertiser_clipping.js
// Mounted at /api/campaigns/clipping in server.js  ← MUST be before /api/campaigns
//
// FIXES:
//  1. Campaign created with status:'waiting_for_approval' (not 'active')
//  2. Removed .populate('assignedWorker') that caused StrictPopulateError
//  3. Added POST /admin/:id/approve  — admin activates a waiting campaign
//  4. Added POST /admin/:id/reject   — admin rejects with a note
//  5. Added GET  /admin/pending      — list all waiting_for_approval campaigns
//  6. Added GET  /admin/all          — list all clipping campaigns (admin view)

import express from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';

import ClippingCampaign from '../models/ClippingCampaign.js';
import ClipSubmission   from '../models/ClipSubmission.js';
import Transaction      from '../models/Transaction.js';
import Wallet           from '../models/Wallet.js';
import User             from '../models/User.js';
import Notification     from '../models/Notification.js';
import { requireAuth }  from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────
const campaignValidation = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters'),
  body('videoUrl').trim().isURL().withMessage('Valid video URL is required'),
  body('budget').isFloat({ min: 0.01 }).withMessage('Budget must be greater than 0'),
  body('currency').isIn(['NGN', 'USDT']).withMessage('Currency must be NGN or USDT'),
  body('platforms').isArray({ min: 1 }).withMessage('At least one platform is required'),
  body('categories').isArray({ min: 1 }).withMessage('At least one category is required'),
  body('costPerThousand').isFloat({ min: 0 }).withMessage('Invalid cost per thousand'),
  body('estimatedViews').isInt({ min: 1 }).withMessage('Invalid estimated views'),
];

// ─── POST / — Create clipping campaign (status → waiting_for_approval) ────────
router.post('/', requireAuth, campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user._id;
    const {
      title, videoUrl, budget, currency, platforms, categories,
      hashtags, directions, ctaUrl, costPerThousand, estimatedViews,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'advertiser' && user.role !== 'admin')
      return res.status(403).json({ error: 'Only advertisers can create campaigns' });

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const availableBalance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
    if (budget > availableBalance)
      return res.status(400).json({ error: `Insufficient ${currency} balance` });

    // Lock funds immediately so budget is reserved while admin reviews
    if (currency === 'NGN') await wallet.lockEscrowNGN(budget);
    else await wallet.lockEscrowUSDT(budget);

    // ── Create campaign as waiting_for_approval ────────────────────────────
    const campaign = new ClippingCampaign({
      advertiser: userId, title, videoUrl, budget, currency,
      costPerThousand, estimatedViews, platforms, categories,
      hashtags:   hashtags   || [],
      directions: directions || [],
      ctaUrl:     ctaUrl     || null,
      status:     'waiting_for_approval',   // ← NOT 'active'
    });
    await campaign.save();

    const transaction = new Transaction({
      user: userId, type: 'campaign_funding', amount: budget, currency,
      status: 'completed', reference: `CAMPAIGN_${campaign._id}`,
      metadata: { campaignId: campaign._id, campaignTitle: title },
    });
    await transaction.save();

    campaign.escrowTransaction = transaction._id;
    await campaign.save();

    res.status(201).json({
      message:    'Campaign submitted for review. It will go live once approved by admin.',
      campaignId: campaign._id,
      campaign,
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ─── GET / — Advertiser's own campaigns ──────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 200 } = req.query;

    const query = { advertiser: userId };
    if (status) query.status = status;

    const [campaigns, total] = await Promise.all([
      ClippingCampaign.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('advertiser', 'firstName lastName email company')
        // ← NO .populate('assignedWorker') — field doesn't exist in schema
        .lean(),
      ClippingCampaign.countDocuments(query),
    ]);

    res.json({
      campaigns,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('Fetch clipping campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ─── GET /stats — Advertiser summary stats ────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId   = req.user._id;
    const campaigns = await ClippingCampaign.find({ advertiser: userId }).lean();
    res.json({
      total:      campaigns.length,
      active:     campaigns.filter((c) => c.status === 'active').length,
      pending:    campaigns.filter((c) => c.status === 'waiting_for_approval').length,
      totalSpent: campaigns.reduce((s, c) => s + (c.totalSpent || 0), 0),
      totalViews: campaigns.reduce((s, c) => s + (c.totalViews || 0), 0),
    });
  } catch (err) {
    console.error('clipping stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /admin/pending — Admin: list waiting_for_approval campaigns ───────────
router.get('/admin/pending', requireAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const filter = { status: 'waiting_for_approval' };
    if (search) filter.title = { $regex: search, $options: 'i' };

    const [campaigns, total] = await Promise.all([
      ClippingCampaign.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('advertiser', 'firstName lastName email company')
        .lean(),
      ClippingCampaign.countDocuments(filter),
    ]);

    res.json({ campaigns, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) });
  } catch (err) {
    console.error('admin pending clipping:', err);
    res.status(500).json({ error: 'Failed to fetch pending campaigns' });
  }
});

// ─── GET /admin/all — Admin: list ALL clipping campaigns with filters ──────────
router.get('/admin/all', requireAdminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const [campaigns, total] = await Promise.all([
      ClippingCampaign.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('advertiser', 'firstName lastName email company')
        .lean(),
      ClippingCampaign.countDocuments(filter),
    ]);

    res.json({ campaigns, total, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) });
  } catch (err) {
    console.error('admin all clipping:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ─── POST /admin/:id/approve — Admin approves → status = 'active' ─────────────
router.post('/admin/:id/approve', requireAdminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid campaign ID' });

    const campaign = await ClippingCampaign.findById(req.params.id).populate('advertiser', 'firstName lastName email');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.status !== 'waiting_for_approval')
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });

    campaign.status = 'active';
    await campaign.save();

    // Notify advertiser
    try {
      await Notification.create({
        user:     campaign.advertiser._id,
        type:     'campaign_approved',
        title:    '✅ Clipping Campaign Approved!',
        message:  `Your clipping campaign "${campaign.title}" has been approved and is now live. Clippers can start joining.`,
        priority: 'high',
      });
    } catch (_) {}

    res.json({ success: true, message: 'Campaign approved and now active.', campaign });
  } catch (err) {
    console.error('admin approve clipping:', err);
    res.status(500).json({ error: 'Failed to approve campaign' });
  }
});

// ─── POST /admin/:id/reject — Admin rejects → refund escrow, status = 'cancelled'
router.post('/admin/:id/reject', requireAdminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid campaign ID' });

    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Rejection reason is required.' });

    const campaign = await ClippingCampaign.findById(req.params.id).populate('advertiser', 'firstName lastName email');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.status !== 'waiting_for_approval')
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });

    // Refund the locked budget back to advertiser
    const wallet = await Wallet.findOne({ user: campaign.advertiser._id });
    if (wallet && campaign.budget > 0) {
      if (campaign.currency === 'NGN') await wallet.releaseEscrowNGN(campaign.budget);
      else await wallet.releaseEscrowUSDT(campaign.budget);

      await Transaction.create({
        user:      campaign.advertiser._id,
        type:      'refund',
        amount:    campaign.budget,
        currency:  campaign.currency,
        status:    'completed',
        reference: `REJECT_REFUND_${campaign._id}`,
        metadata:  { campaignId: campaign._id, reason: reason.trim() },
      });
    }

    campaign.status      = 'cancelled';
    campaign.cancelledAt = new Date();
    await campaign.save();

    // Notify advertiser
    try {
      await Notification.create({
        user:     campaign.advertiser._id,
        type:     'campaign_rejected',
        title:    '❌ Clipping Campaign Rejected',
        message:  `Your clipping campaign "${campaign.title}" was not approved. Reason: ${reason.trim()}. Your budget has been refunded.`,
        priority: 'high',
      });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Campaign rejected and budget refunded to advertiser.',
      refundedAmount: campaign.budget,
      currency: campaign.currency,
    });
  } catch (err) {
    console.error('admin reject clipping:', err);
    res.status(500).json({ error: 'Failed to reject campaign' });
  }
});

// ─── GET /:id — Single campaign ────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid campaign ID' });

    const campaign = await ClippingCampaign.findById(req.params.id)
      .populate('advertiser', 'firstName lastName email company');
      // ← NO assignedWorker populate

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.advertiser._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Unauthorized' });

    res.json(campaign);
  } catch (error) {
    console.error('Fetch campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// ─── GET /:id/submissions ───────────────────────────────────────────────────────
router.get('/:id/submissions', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ error: 'Invalid campaign ID' });

    const campaign = await ClippingCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Unauthorized' });

    const submissions = await ClipSubmission.find({ campaign: req.params.id })
      .populate('clipper', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error('clipping submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ─── POST /:id/cancel — Cancel & refund remaining budget ────────────────────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid campaign ID' });
    }

    const campaign = await ClippingCampaign.findById(req.params.id).session(session);
    if (!campaign) { await session.abortTransaction(); return res.status(404).json({ error: 'Campaign not found' }); }

    if (campaign.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      await session.abortTransaction();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (['completed', 'cancelled'].includes(campaign.status)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Campaign cannot be cancelled' });
    }

    const remainingBudget = campaign.budget - (campaign.totalSpent || 0);
    const wallet = await Wallet.findOne({ user: campaign.advertiser }).session(session);
    if (!wallet) { await session.abortTransaction(); return res.status(404).json({ error: 'Wallet not found' }); }

    if (remainingBudget > 0) {
      if (campaign.currency === 'NGN') await wallet.releaseEscrowNGN(remainingBudget);
      else await wallet.releaseEscrowUSDT(remainingBudget);
    }

    campaign.status      = 'cancelled';
    campaign.cancelledAt = new Date();
    await campaign.save({ session });

    if (remainingBudget > 0) {
      await new Transaction({
        user: campaign.advertiser, type: 'refund',
        amount: remainingBudget, currency: campaign.currency,
        status: 'completed', reference: `REFUND_${campaign._id}`,
        metadata: { campaignId: campaign._id, campaignTitle: campaign.title },
      }).save({ session });
    }

    await session.commitTransaction();
    res.json({ message: 'Campaign cancelled successfully', refundedAmount: remainingBudget, currency: campaign.currency });
  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel campaign error:', error);
    res.status(500).json({ error: 'Failed to cancel campaign' });
  } finally {
    session.endSession();
  }
});

export default router;