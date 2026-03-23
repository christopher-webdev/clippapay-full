// routes/applications.js
//
// FLOW REDESIGN — "Reactivation on offer failure":
//
//  SELECT:  Advertiser picks a clipper.
//           → Only THAT application moves to 'selected'.
//           → All others STAY 'pending'. (Key change — no mass-reject here)
//           → Escrow is locked.
//           → Clipper has 2 hours.
//
//  ACCEPT:  Clipper accepts within 2 hours.
//           → Application moves to 'accepted', 48h submission deadline set.
//           → NOW all other pending applicants are mass-rejected (inside model).
//           → Advertiser notified.
//
//  DECLINE: Clipper actively rejects the offer.
//           → Application moves to 'declined'.
//           → Escrow UNLOCKED back to advertiser.
//           → Advertiser notified: "pick another".
//           → All other pending applicants remain available.
//
//  EXPIRE:  Cron job (or lazy-check on select endpoint) detects offerExpiresAt passed.
//           → Application moves to 'expired'.
//           → Escrow UNLOCKED back to advertiser.
//           → Advertiser notified: "clipper didn't respond — pick another".
//           → All other pending applicants remain available.
//
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Application from '../models/Application.js';
import Campaign from '../models/Campaign.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdvertiser, requireClipper } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ── Multer ────────────────────────────────────────────────────────────────────
const videoUploadDir = path.join(process.cwd(), 'uploads/videos');
await fs.mkdir(videoUploadDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoUploadDir),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files allowed (mp4, mov, webm)'), false);
  },
});

// ── Helper: unlock escrow back to advertiser ──────────────────────────────────
// The Wallet model has lockEscrowNGN/USDT and releaseEscrowNGN/USDT (releases TO clipper),
// but NO unlockEscrowNGN/USDT. To simply return locked funds to the advertiser's
// available balance we directly mutate the escrow fields — same pattern used in campaigns.js.
async function unlockEscrow(advertiserUserId, currency, amount) {
  const wallet = await Wallet.findOne({ user: advertiserUserId });
  if (!wallet) return;

  if (currency === 'NGN') {
    // Move amount from escrowLocked back to available balance
    const deduct = Math.min(amount, wallet.escrowLocked || 0);
    wallet.escrowLocked = (wallet.escrowLocked || 0) - deduct;
    wallet.balance      = (wallet.balance      || 0) + deduct;
  } else {
    const deduct = Math.min(amount, wallet.usdtEscrowLocked || 0);
    wallet.usdtEscrowLocked = (wallet.usdtEscrowLocked || 0) - deduct;
    wallet.usdtBalance      = (wallet.usdtBalance      || 0) + deduct;
  }

  await wallet.save();
}

// ── Helper: check if a 'selected' application has expired, handle it inline ───
// Call this at the start of any route that reads a 'selected' application.
async function handleExpiredOffer(application) {
  if (
    application.status === 'selected' &&
    application.offerExpiresAt &&
    new Date() > application.offerExpiresAt
  ) {
    // Mark expired
    application.status = 'expired';
    await application.save();

    // Unlock escrow
    const campaign = application.campaign?._id
      ? application.campaign          // already populated
      : await Campaign.findById(application.campaign);

    await unlockEscrow(campaign.advertiser, application.paymentCurrency, application.paymentAmount);

    // Notify advertiser
    await new Notification({
      user:    campaign.advertiser,
      type:    'offer_expired',
      title:   'Offer Expired — Pick Another Creator',
      message: `The clipper didn't respond in time for "${campaign.title}". Your funds have been returned. You can now select another applicant.`,
      data:    { campaignId: campaign._id, applicationId: application._id },
      priority:'high',
    }).save();

    return true; // was expired
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLIPPER APPLIES TO A CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:campaignId/apply', requireAuth, requireClipper, async (req, res) => {
  try {
    const { proposedRateNGN, proposedRateUSDT, note } = req.body;
    const campaignId = req.params.campaignId;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'active') {
      return res.status(403).json({ error: 'Campaign is no longer accepting applications' });
    }
    if (new Date() > campaign.applicationDeadline) {
      return res.status(403).json({ error: 'Application deadline has passed' });
    }

    const existing = await Application.findOne({ campaign: campaignId, clipper: req.user._id });
    if (existing) return res.status(400).json({ error: 'You have already applied to this campaign' });

    const application = new Application({
      campaign:         campaignId,
      clipper:          req.user._id,
      proposedRateNGN:  proposedRateNGN  ? Number(proposedRateNGN)  : undefined,
      proposedRateUSDT: proposedRateUSDT ? Number(proposedRateUSDT) : undefined,
      note:             note?.trim(),
    });
    await application.save();

    await new Notification({
      user:    campaign.advertiser,
      type:    'new_application',
      title:   'New Application Received',
      message: `A creator has applied to your campaign "${campaign.title}"`,
      data:    { campaignId: campaign._id, applicationId: application._id },
      priority:'medium',
    }).save();

    res.status(201).json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADVERTISER GETS ALL APPLICATIONS FOR THEIR CAMPAIGN
//  Also lazy-expires any stale 'selected' application on the way in.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/campaign/:campaignId', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id:        req.params.campaignId,
      advertiser: req.user._id,
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found or not yours' });

    // Lazy-expire any stale selected offer
    const staleSelected = await Application.findOne({
      campaign: campaign._id,
      status:   'selected',
    }).populate('campaign');

    if (staleSelected) {
      await handleExpiredOffer(staleSelected);
    }

    const applications = await Application.find({ campaign: campaign._id })
      .populate('clipper', 'firstName lastName profileImage rating sampleVideos bio categories')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, campaign: { title: campaign.title, currency: campaign.currency }, applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADVERTISER SELECTS A CLIPPER → LOCK ESCROW
//  KEY CHANGE: Does NOT reject others. Others stay 'pending'.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:applicationId/select', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const { currency } = req.body;
    if (!['NGN', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be NGN or USDT' });
    }

    const application = await Application.findById(req.params.applicationId).populate('campaign');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const campaign = application.campaign;
    if (campaign.advertiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    // If there's already a 'selected' application, check if it's expired first
    const existingSelected = await Application.findOne({
      campaign: campaign._id,
      status:   'selected',
      _id:      { $ne: application._id },
    }).populate('campaign');

    if (existingSelected) {
      const wasExpired = await handleExpiredOffer(existingSelected);
      if (!wasExpired) {
        return res.status(400).json({
          error:            'Another offer is still active. Wait for it to expire or for the clipper to respond.',
          offerExpiresAt:   existingSelected.offerExpiresAt,
          applicationId:    existingSelected._id,
        });
      }
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application is already in status: ${application.status}` });
    }
    if (campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign no longer active' });
    }

    // Amount from clipper's proposed rate
    const amount = currency === 'NGN' ? application.proposedRateNGN : application.proposedRateUSDT;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: `Clipper did not propose a ${currency} rate` });
    }

    // Lock escrow
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    if (currency === 'NGN') {
      if (wallet.balance < amount) {
        return res.status(400).json({ error: `Insufficient NGN balance. Need ₦${amount.toLocaleString()}` });
      }
      await wallet.lockEscrowNGN(amount);
    } else {
      if (wallet.usdtBalance < amount) {
        return res.status(400).json({ error: `Insufficient USDT balance. Need ${amount} USDT` });
      }
      await wallet.lockEscrowUSDT(amount);
    }

    // Select application (does NOT reject others — see Application model)
    await application.select(currency, amount);

    // Notify selected clipper
    await new Notification({
      user:    application.clipper,
      type:    'offer_received',
      title:   '🎉 You\'ve Been Selected!',
      message: `${campaign.title} — you have 2 hours to accept. Payment: ${currency === 'NGN' ? '₦' : ''}${amount}${currency === 'USDT' ? ' USDT' : ''}.`,
      data:    { campaignId: campaign._id, applicationId: application._id, amount, currency },
      priority:'high',
    }).save();

    // Record escrow-lock transaction
    try {
      await new Transaction({
        user:      req.user._id,
        type:      'payment',
        amount,
        currency,
        status:    'completed',
        reference: `app:${application._id}`,
        note:      `Escrow locked for campaign "${campaign.title}"`,
        metadata:  { campaignId: campaign._id, applicationId: application._id, action: 'escrow_lock' },
      }).save();
    } catch (txErr) {
      console.warn('Transaction recording warning:', txErr.message);
    }

    res.json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to select clipper' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CLIPPER ACCEPTS THE OFFER (within 2 hours)
//  KEY CHANGE: acceptOffer() now mass-rejects all other pending applicants.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:applicationId/accept', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId).populate('campaign');
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.clipper.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your application' });
    }

    // Lazy expire check
    const wasExpired = await handleExpiredOffer(application);
    if (wasExpired) {
      return res.status(400).json({ error: 'Sorry, your offer window has expired. The advertiser has been notified.' });
    }

    // acceptOffer() rejects all other pending applicants inside the model
    await application.acceptOffer();

    // Notify advertiser
    await new Notification({
      user:    application.campaign.advertiser,
      type:    'offer_accepted',
      title:   '✅ Creator Accepted Your Offer',
      message: `The creator accepted your offer for "${application.campaign.title}". They have 48 hours to deliver the video.`,
      data:    { campaignId: application.campaign._id, applicationId: application._id },
      priority:'high',
    }).save();

    res.json({ success: true, application });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to accept offer' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CLIPPER DECLINES THE OFFER
//  KEY CHANGE: Unlocks escrow + reactivation message to advertiser.
//              Other pending applicants remain available.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/decline', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('campaign');
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.clipper.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your application' });
    }
    if (application.status !== 'selected') {
      return res.status(400).json({ error: `Cannot decline in status: ${application.status}` });
    }

    const campaign = application.campaign;

    // Decline the offer
    await application.declineOffer();

    // Unlock escrow back to advertiser
    await unlockEscrow(campaign.advertiser, application.paymentCurrency, application.paymentAmount);

    // Count remaining pending applicants
    const remaining = await Application.countDocuments({
      campaign: campaign._id,
      status:   'pending',
    });

    // Notify advertiser — tell them exactly what happened and what to do
    await new Notification({
      user:    campaign.advertiser,
      type:    'offer_declined',
      title:   '❌ Creator Declined Your Offer',
      message: remaining > 0
        ? `The creator declined your offer for "${campaign.title}". Your funds have been returned. You have ${remaining} other applicant${remaining === 1 ? '' : 's'} — go pick another.`
        : `The creator declined your offer for "${campaign.title}". Your funds have been returned. No other applicants remain — consider sharing your campaign to get more applications.`,
      data:    { campaignId: campaign._id, applicationId: application._id, remainingApplicants: remaining },
      priority:'high',
    }).save();

    res.json({
      success:   true,
      message:   'Offer declined',
      remaining,
    });
  } catch (err) {
    console.error('Decline error:', err);
    res.status(500).json({ error: err.message || 'Failed to decline offer' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL EXPIRE CHECK — POST /api/applications/:id/check-expiry
//  Can be called by the mobile app when opening the offer screen,
//  or by a cron job. Safe to call multiple times (idempotent).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/check-expiry', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('campaign');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const wasExpired = await handleExpiredOffer(application);
    res.json({ success: true, expired: wasExpired, status: application.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CRON-FRIENDLY BATCH EXPIRY — POST /api/applications/expire-stale
//  Call this from a cron job every 5-15 minutes.
//  No auth required from cron — protect with a secret header in production.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/expire-stale', async (req, res) => {
  // Simple protection — set CRON_SECRET in your env
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Find all expired-but-not-yet-processed offers
    const stale = await Application.find({
      status:         'selected',
      offerExpiresAt: { $lt: new Date() },
    }).populate('campaign');

    const results = [];
    for (const app of stale) {
      try {
        await app.markExpiredOffer();
        await unlockEscrow(app.campaign.advertiser, app.paymentCurrency, app.paymentAmount);

        const remaining = await Application.countDocuments({
          campaign: app.campaign._id,
          status:   'pending',
        });

        await new Notification({
          user:    app.campaign.advertiser,
          type:    'offer_expired',
          title:   '⏰ Offer Expired — Pick Another Creator',
          message: remaining > 0
            ? `The creator didn't respond in time for "${app.campaign.title}". Your funds have been returned. You have ${remaining} other applicant${remaining === 1 ? '' : 's'} waiting.`
            : `The creator didn't respond in time for "${app.campaign.title}". Your funds have been returned. No other applicants remain.`,
          data:    { campaignId: app.campaign._id, applicationId: app._id, remainingApplicants: remaining },
          priority:'high',
        }).save();

        results.push({ applicationId: app._id, status: 'expired', remaining });
      } catch (innerErr) {
        results.push({ applicationId: app._id, error: innerErr.message });
      }
    }

    res.json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('Batch expiry error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CLIPPER SUBMITS VIDEO
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/submit',
  requireAuth,
  requireClipper,
  videoUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.id).populate('campaign');
      if (!application) return res.status(404).json({ error: 'Not found' });
      if (application.clipper.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your application' });
      }
      if (!['accepted', 'revision_requested'].includes(application.status)) {
        return res.status(400).json({ error: 'Can only submit after accepting offer or revision request' });
      }
      if (!req.files?.video?.[0]) {
        return res.status(400).json({ error: 'Video file is required' });
      }

      const videoPath     = `/uploads/videos/${req.files.video[0].filename}`;
      const thumbnailPath = req.files.thumbnail?.[0]
        ? `/uploads/videos/${req.files.thumbnail[0].filename}`
        : null;

      await application.submitVideo(videoPath, thumbnailPath);
      await application.campaign.addVideoSubmission(application._id, req.user._id, videoPath, thumbnailPath);

      await new Notification({
        user:    application.campaign.advertiser,
        type:    'submission_received',
        title:   application.revisionCount > 0 ? '🔄 Revised Video Submitted' : '🎬 Video Submitted for Review',
        message: `Creator ${application.revisionCount > 0 ? 'resubmitted' : 'submitted'} their video for "${application.campaign.title}". Please review and approve or request changes.`,
        data:    { campaignId: application.campaign._id, applicationId: application._id, videoUrl: videoPath, revisionCount: application.revisionCount },
        priority:'high',
      }).save();

      res.json({ success: true, message: 'Video submitted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to submit video' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  ADVERTISER REQUESTS REVISION (max 3)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:applicationId/revision', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback?.trim()) return res.status(400).json({ error: 'Feedback is required' });

    const application = await Application.findById(req.params.applicationId).populate('campaign');
    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    await application.requestRevision(feedback.trim());

    await new Notification({
      user:    application.clipper,
      type:    'revision_requested',
      title:   '✏️ Revision Requested',
      message: `Revision ${application.revisionCount}/3 requested for "${application.campaign.title}": ${feedback.trim()}`,
      data:    { campaignId: application.campaign._id, applicationId: application._id, feedback: application.lastFeedback },
      priority:'high',
    }).save();

    res.json({ success: true, application });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to request revision' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADVERTISER APPROVES FINAL VIDEO → RELEASE ESCROW
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:applicationId/approve', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId).populate('campaign clipper');
    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not yours' });
    }

    await application.approve();

    // Release escrow → clipper
    const [walletAdvertiser, walletClipper] = await Promise.all([
      Wallet.findOne({ user: req.user._id }),
      Wallet.findOneAndUpdate(
        { user: application.clipper._id },
        { $setOnInsert: { user: application.clipper._id } },
        { upsert: true, new: true }
      ),
    ]);

    const { paymentAmount: amount, paymentCurrency: currency } = application;
    if (currency === 'NGN') {
      await walletAdvertiser.releaseEscrowNGN(amount);
      await walletClipper.creditNGN(amount);
    } else {
      await walletAdvertiser.releaseEscrowUSDT(amount);
      await walletClipper.creditUSDT(amount);
    }

    // Record transactions
    try {
      await Promise.all([
        new Transaction({
          user: application.clipper._id, type: 'payment', amount, currency,
          status: 'completed', reference: `app:${application._id}`,
          note: `Payment for approved video — "${application.campaign.title}"`,
          metadata: { campaignId: application.campaign._id, applicationId: application._id, action: 'payment_release' },
        }).save(),
        new Transaction({
          user: req.user._id, type: 'withdrawal', amount, currency,
          status: 'completed', reference: `app:${application._id}`,
          note: `Escrow released to creator — "${application.campaign.title}"`,
          metadata: { campaignId: application.campaign._id, applicationId: application._id, action: 'escrow_release' },
        }).save(),
      ]);
    } catch (txErr) {
      console.warn('Transaction recording warning:', txErr.message);
    }

    await new Notification({
      user:    application.clipper._id,
      type:    'payment_received',
      title:   '💰 Payment Received!',
      message: `Your video for "${application.campaign.title}" was approved. ${currency === 'NGN' ? '₦' : ''}${amount}${currency === 'USDT' ? ' USDT' : ''} has been credited to your wallet.`,
      data:    { applicationId: application._id, amount, currency: application.paymentCurrency },
      priority:'high',
    }).save();

    await application.campaign.markCompleted();

    res.json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Approval failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET CLIPPER'S OWN APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', requireAuth, requireClipper, async (req, res) => {
  try {
    const applications = await Application.find({ clipper: req.user._id })
      .populate({
        path:     'campaign',
        select:   'title thumbnailUrl category preferredLength applicationDeadline advertiser',
        populate: { path: 'advertiser', select: 'firstName lastName company profileImage rating' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE APPLICATION (advertiser or clipper)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path:     'campaign',
        select:   'title description script thumbnailUrl category preferredLength applicationDeadline creativeDirection advertiser keyPhrases',
        populate: { path: 'advertiser', select: 'firstName lastName company profileImage rating' },
      })
      .populate('clipper', 'firstName lastName profileImage');

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const isClipper    = application.clipper._id.toString() === req.user._id.toString();
    const isAdvertiser = application.campaign?.advertiser?._id?.toString() === req.user._id.toString();
    if (!isClipper && !isAdvertiser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Lazy expire check when either party opens the application
    if (application.status === 'selected') {
      await handleExpiredOffer(application);
    }

    res.json({ success: true, application });
  } catch (err) {
    console.error('Error fetching application:', err);
    res.status(500).json({ error: 'Failed to load application' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADVERTISER PENDING COUNT (for footer badge)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/advertiser/pending-count', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ advertiser: req.user._id }).select('_id');
    const campaignIds = campaigns.map(c => c._id);
    const count = await Application.countDocuments({
      campaign: { $in: campaignIds },
      status:   'pending',
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load count' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  RAISE DISPUTE (clipper or advertiser)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/dispute', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Please describe the issue.' });

    const application = await Application.findById(req.params.id).populate('campaign clipper');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const isClipper    = application.clipper._id.toString() === req.user._id.toString();
    const isAdvertiser = application.campaign.advertiser.toString() === req.user._id.toString();
    if (!isClipper && !isAdvertiser) return res.status(403).json({ error: 'Access denied' });
    if (application.disputeRaised) {
      return res.status(400).json({ error: 'A dispute has already been raised on this application.' });
    }

    application.disputeRaised = true;
    application.status = 'disputed';
    await application.save();

    const raisedBy  = isClipper ? 'creator' : 'advertiser';
    const otherParty = isClipper ? application.campaign.advertiser : application.clipper._id;

    await new Notification({
      user:    otherParty,
      type:    'dispute_raised',
      title:   '⚠️ Dispute Raised',
      message: `A dispute has been raised on "${application.campaign.title}". Our team will review and contact both parties.`,
      data:    { campaignId: application.campaign._id, applicationId: application._id },
      priority:'high',
    }).save();

    res.json({ success: true, message: 'Dispute raised. Our team will review within 24-48 hours.' });
  } catch (err) {
    console.error('Dispute error:', err);
    res.status(500).json({ error: err.message || 'Failed to raise dispute' });
  }
});

export default router;

// // routes/applications.js
// import express from 'express';
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs/promises';
// import Application from '../models/Application.js';
// import Campaign from '../models/Campaign.js';
// import Wallet from '../models/Wallet.js';
// import Notification from '../models/Notification.js';
// import Transaction from '../models/Transaction.js';
// import { requireAuth } from '../middleware/auth.js';
// import { requireAdvertiser, requireClipper } from '../middleware/roleMiddleware.js';
// import { requireAdminAuth } from '../middleware/adminAuth.js';

// const router = express.Router();

// // ────────────────────────────────────────────────
// //              MULTER CONFIG – VIDEO SUBMISSIONS
// // ────────────────────────────────────────────────
// const videoUploadDir = path.join(process.cwd(), 'uploads/videos');
// await fs.mkdir(videoUploadDir, { recursive: true });

// const videoStorage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, videoUploadDir),
//   filename: (req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, `${unique}${path.extname(file.originalname)}`);
//   }
// });

// const videoUpload = multer({
//   storage: videoStorage,
//   limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — adjust as needed
//   fileFilter: (req, file, cb) => {
//     const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
//     if (allowed.includes(file.mimetype)) cb(null, true);
//     else cb(new Error('Only video files allowed (mp4, mov, webm)'), false);
//   }
// });

// // ────────────────────────────────────────────────
// //      CLIPPER APPLIES TO A CAMPAIGN
// // ────────────────────────────────────────────────
// router.post(
//   '/:campaignId/apply',
//   requireAuth,
//   requireClipper,
//   async (req, res) => {
//     try {
//       const { proposedRateNGN, proposedRateUSDT, note } = req.body;
//       const campaignId = req.params.campaignId;

//       const campaign = await Campaign.findById(campaignId);
//       if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
//       if (campaign.status !== 'active') {
//         return res.status(403).json({ error: 'Campaign is no longer accepting applications' });
//       }
//       if (new Date() > campaign.applicationDeadline) {
//         return res.status(403).json({ error: 'Application deadline has passed' });
//       }

//       // Prevent duplicate applications
//       const existing = await Application.findOne({
//         campaign: campaignId,
//         clipper: req.user._id
//       });
//       if (existing) {
//         return res.status(400).json({ error: 'You have already applied to this campaign' });
//       }

//       const application = new Application({
//         campaign: campaignId,
//         clipper: req.user._id,
//         proposedRateNGN: proposedRateNGN ? Number(proposedRateNGN) : undefined,
//         proposedRateUSDT: proposedRateUSDT ? Number(proposedRateUSDT) : undefined,
//         note: note?.trim(),
//       });

//       await application.save();

//       // Notify advertiser
//       await new Notification({
//         user: campaign.advertiser,
//         type: 'new_application',
//         title: 'New Application Received',
//         message: `A clipper has applied to your campaign "${campaign.title}"`,
//         data: { campaignId: campaign._id, applicationId: application._id },
//         priority: 'medium'
//       }).save();

//       res.status(201).json({ success: true, application });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to submit application' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      ADVERTISER GETS ALL APPLICATIONS FOR THEIR CAMPAIGN
// // ────────────────────────────────────────────────
// router.get(
//   '/campaign/:campaignId',
//   requireAuth,
//   requireAdvertiser,
//   async (req, res) => {
//     try {
//       const campaign = await Campaign.findOne({
//         _id: req.params.campaignId,
//         advertiser: req.user._id
//       });

//       if (!campaign) return res.status(404).json({ error: 'Campaign not found or not yours' });

//       const applications = await Application.find({ campaign: campaign._id })
//         .populate('clipper', 'firstName lastName profileImage rating sampleVideos bio categories')
//         .sort({ createdAt: -1 })
//         .lean();

//       res.json({
//         success: true,
//         campaign: { title: campaign.title },
//         applications,
//       });
//     } catch (err) {
//       res.status(500).json({ error: 'Failed to load applications' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      ADVERTISER SELECTS A CLIPPER → LOCK ESCROW
// // ────────────────────────────────────────────────
// router.post(
//   '/:applicationId/select',
//   requireAuth,
//   requireAdvertiser,
//   async (req, res) => {
//     try {
//       const { currency } = req.body; // 'NGN' or 'USDT'
//       if (!['NGN', 'USDT'].includes(currency)) {
//         return res.status(400).json({ error: 'Currency must be NGN or USDT' });
//       }

//       const application = await Application.findById(req.params.applicationId)
//         .populate('campaign');

//       if (!application) return res.status(404).json({ error: 'Application not found' });

//       const campaign = application.campaign;
//       if (campaign.advertiser.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not your campaign' });
//       }

//       if (application.status !== 'pending') {
//         return res.status(400).json({ error: `Application already in status: ${application.status}` });
//       }

//       if (campaign.status !== 'active') {
//         return res.status(400).json({ error: 'Campaign no longer active' });
//       }

//       // Determine amount to lock
//       let amount;
//       if (currency === 'NGN') {
//         amount = application.proposedRateNGN;
//         if (!amount || amount <= 0) {
//           return res.status(400).json({ error: 'Clipper did not propose NGN rate' });
//         }
//       } else {
//         amount = application.proposedRateUSDT;
//         if (!amount || amount <= 0) {
//           return res.status(400).json({ error: 'Clipper did not propose USDT rate' });
//         }
//       }

//       const wallet = await Wallet.findOne({ user: req.user._id });
//       if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

//       // Lock escrow
//       if (currency === 'NGN') {
//         if (wallet.balance < amount) {
//           return res.status(400).json({ error: `Insufficient NGN balance. Need ₦${amount.toLocaleString()}` });
//         }
//         await wallet.lockEscrowNGN(amount);
//       } else {
//         if (wallet.usdtBalance < amount) {
//           return res.status(400).json({ error: `Insufficient USDT balance. Need ${amount} USDT` });
//         }
//         await wallet.lockEscrowUSDT(amount);
//       }

//       // Select application
//       await application.select(currency, amount);

//       // Auto-reject all other pending applications for this campaign
//       await Application.updateMany(
//         {
//           campaign: campaign._id,
//           _id: { $ne: application._id },
//           status: 'pending'
//         },
//         { $set: { status: 'rejected', rejectedAt: new Date(), rejectedReason: 'Another clipper was selected' } }
//       );

//       // Notify selected clipper
//       await new Notification({
//         user: application.clipper,
//         type: 'offer_received',
//         title: 'You’ve Been Selected!',
//         message: `The advertiser selected you for "${campaign.title}". You have 2 hours to accept. Amount: ${currency === 'NGN' ? '₦' : ''}${amount}${currency === 'USDT' ? ' USDT' : ''}`,
//         data: {
//           campaignId: campaign._id,
//           applicationId: application._id,
//           amount,
//           currency
//         },
//         priority: 'high'
//       }).save();

//       // Create transaction record for escrow lock (using valid enum)
//       try {
//         await new Transaction({
//           user: req.user._id,
//           type: 'payment', // Valid enum: 'payment'
//           amount,
//           currency,
//           status: 'completed',
//           reference: `app:${application._id}`,
//           note: `Escrow locked for campaign "${campaign.title}"`,
//           metadata: {
//             campaignId: campaign._id,
//             applicationId: application._id,
//             clipperId: application.clipper,
//             action: 'escrow_lock',
//             status: 'pending_delivery'
//           }
//         }).save();
//       } catch (txError) {
//         // Log but don't fail - transaction recording is non-critical
//         console.warn('Transaction recording warning:', txError.message);
//       }

//       res.json({ success: true, application });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: err.message || 'Failed to select clipper' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      CLIPPER ACCEPTS THE OFFER (within 2 hours)
// // ────────────────────────────────────────────────
// router.post(
//   '/:applicationId/accept',
//   requireAuth,
//   requireClipper,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.applicationId)
//         .populate('campaign');

//       if (!application) return res.status(404).json({ error: 'Application not found' });
//       if (application.clipper.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not your application' });
//       }

//       await application.acceptOffer();

//       // Notify advertiser
//       await new Notification({
//         user: application.campaign.advertiser,
//         type: 'offer_accepted',
//         title: 'Clipper Accepted Your Offer',
//         message: `The selected clipper has accepted your offer for "${application.campaign.title}". They have 48 hours to deliver.`,
//         data: { campaignId: application.campaign._id, applicationId: application._id },
//         priority: 'high'
//       }).save();

//       res.json({ success: true, application });
//     } catch (err) {
//       res.status(400).json({ error: err.message || 'Failed to accept offer' });
//     }
//   }
// );


// // POST /api/applications/:id/submit
// router.post(
//   '/:id/submit',
//   requireAuth,
//   requireClipper,
//   videoUpload.fields([
//     { name: 'video', maxCount: 1 },
//     { name: 'thumbnail', maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.id)
//         .populate('campaign');

//       if (!application) return res.status(404).json({ error: 'Not found' });

//       if (application.clipper.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not your application' });
//       }

//       if (application.status !== 'accepted' && application.status !== 'revision_requested') {
//         return res.status(400).json({ error: 'Can only submit after accepting offer or revision request' });
//       }

//       if (!req.files?.video?.[0]) {
//         return res.status(400).json({ error: 'Video file is required' });
//       }

//       const videoPath = `/uploads/videos/${req.files.video[0].filename}`;
//       let thumbnailPath = null;

//       if (req.files.thumbnail?.[0]) {
//         thumbnailPath = `/uploads/videos/${req.files.thumbnail[0].filename}`;
//       }

//       // Optional note
//       const submissionNote = req.body.note?.trim();

//       await application.submitVideo(videoPath, thumbnailPath);

//       // Add submission to campaign
//       await application.campaign.addVideoSubmission(
//         application._id,
//         req.user._id,
//         videoPath,
//         thumbnailPath
//       );

//       // Notify advertiser
//       await new Notification({
//         user: application.campaign.advertiser,
//         type: 'submission_received',
//         title: application.status === 'revision_requested' ? 'Revised Video Submitted' : 'Video Submitted',
//         message: `Clipper ${application.status === 'revision_requested' ? 'resubmitted' : 'submitted'} video for "${application.campaign.title}"`,
//         data: {
//           campaignId: application.campaign._id,
//           applicationId: application._id,
//           videoUrl: videoPath,
//           note: submissionNote,
//           revisionCount: application.revisionCount
//         },
//         priority: 'high',
//       }).save();

//       res.json({ 
//         success: true, 
//         message: 'Video submitted successfully',
//         campaignStatus: application.campaign.status 
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to submit video' });
//     }
//   }
// );
// // ────────────────────────────────────────────────
// //      ADVERTISER REQUESTS REVISION (max 3)
// // ────────────────────────────────────────────────
// router.post(
//   '/:applicationId/revision',
//   requireAuth,
//   requireAdvertiser,
//   async (req, res) => {
//     try {
//       const { feedback } = req.body;
//       if (!feedback?.trim()) {
//         return res.status(400).json({ error: 'Feedback is required for revision' });
//       }

//       const application = await Application.findById(req.params.applicationId)
//         .populate('campaign');

//       if (!application) return res.status(404).json({ error: 'Not found' });

//       if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not your campaign' });
//       }

//       await application.requestRevision(feedback.trim());

//       // Notify clipper
//       await new Notification({
//         user: application.clipper,
//         type: 'revision_requested',
//         title: 'Revision Requested',
//         message: `The advertiser requested changes to your submission for "${application.campaign.title}" (revision ${application.revisionCount})`,
//         data: {
//           campaignId: application.campaign._id,
//           applicationId: application._id,
//           feedback: application.lastFeedback
//         },
//         priority: 'high'
//       }).save();

//       res.json({ success: true, application });
//     } catch (err) {
//       res.status(400).json({ error: err.message || 'Failed to request revision' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      ADVERTISER APPROVES FINAL VIDEO → RELEASE ESCROW
// // ────────────────────────────────────────────────
// router.post(
//   '/:applicationId/approve',
//   requireAuth,
//   requireAdvertiser,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.applicationId)
//         .populate('campaign clipper');

//       if (!application) return res.status(404).json({ error: 'Not found' });

//       if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not yours' });
//       }

//       await application.approve();

//       // Release escrow to clipper
//       const walletAdvertiser = await Wallet.findOne({ user: req.user._id });
//       let walletClipper = await Wallet.findOne({ user: application.clipper._id });

//       if (!walletClipper) {
//         // edge case — create wallet if missing
//         walletClipper = await Wallet.create({ user: application.clipper._id });
//       }

//       let amount = application.paymentAmount;
//       if (application.paymentCurrency === 'NGN') {
//         await walletAdvertiser.releaseEscrowNGN(amount);
//         await walletClipper.creditNGN(amount);
//       } else {
//         await walletAdvertiser.releaseEscrowUSDT(amount);
//         await walletClipper.creditUSDT(amount);
//       }

//       // Record payout transaction for clipper
//       try {
//         await new Transaction({
//           user: application.clipper._id,
//           type: 'payment', // Using 'payment' for receiving funds
//           amount,
//           currency: application.paymentCurrency,
//           status: 'completed',
//           reference: `app:${application._id}`,
//           note: `Payment for approved video in "${application.campaign.title}"`,
//           metadata: {
//             campaignId: application.campaign._id,
//             applicationId: application._id,
//             action: 'payment_release',
//             fromAdvertiser: req.user._id
//           }
//         }).save();

//         // Record transaction for advertiser (funds released)
//         await new Transaction({
//           user: req.user._id,
//           type: 'withdrawal', // Valid enum: 'withdrawal'
//           amount,
//           currency: application.paymentCurrency,
//           status: 'completed',
//           reference: `app:${application._id}`,
//           note: `Payment released to clipper for "${application.campaign.title}"`,
//           metadata: {
//             campaignId: application.campaign._id,
//             applicationId: application._id,
//             action: 'escrow_release',
//             toClipper: application.clipper._id
//           }
//         }).save();
//       } catch (txError) {
//         console.warn('Transaction recording warning:', txError.message);
//       }

//       // Notify clipper
//       await new Notification({
//         user: application.clipper._id,
//         type: 'payment_received',
//         title: 'Payment Received!',
//         message: `Your video for "${application.campaign.title}" was approved. ${application.paymentCurrency === 'NGN' ? '₦' : ''}${amount}${application.paymentCurrency === 'USDT' ? ' USDT' : ''} has been credited to your wallet.`,
//         data: { 
//           applicationId: application._id, 
//           amount, 
//           currency: application.paymentCurrency 
//         },
//         priority: 'high'
//       }).save();

//       // Mark campaign as completed if this was the only/one active application
//       await application.campaign.markCompleted();

//       res.json({ success: true, application });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: err.message || 'Approval failed' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      GET CLIPPER'S APPLICATIONS
// // ────────────────────────────────────────────────
// router.get('/my', requireAuth, requireClipper, async (req, res) => {
//   try {
//     const applications = await Application.find({ clipper: req.user._id })
//       .populate({
//         path: 'campaign',
//         select: 'title thumbnailUrl category preferredLength applicationDeadline advertiser',
//         populate: {
//           path: 'advertiser',
//           select: 'firstName lastName company profileImage rating',
//         },
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json({ success: true, applications });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to load applications' });
//   }
// });

// router.get(
//   '/:id',
//   requireAuth,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.id)
//         .populate({
//           path: 'campaign',
//           select: `
//             title 
//             description
//             script
//             thumbnailUrl 
//             category 
//             preferredLength 
//             applicationDeadline 
//             creativeDirection
//             advertiser
//           `,
//           populate: {
//             path: 'advertiser',
//             select: 'firstName lastName company profileImage rating',
//           },
//         })
//         .populate('clipper', 'firstName lastName profileImage');

//       if (!application) {
//         return res.status(404).json({ error: 'Application not found' });
//       }

//       const isClipper =
//         application.clipper._id.toString() === req.user._id.toString();

//       const isAdvertiser =
//         application.campaign?.advertiser?._id?.toString() ===
//         req.user._id.toString();

//       if (!isClipper && !isAdvertiser) {
//         return res.status(403).json({ error: 'Access denied' });
//       }

//       res.json({ success: true, application });
//     } catch (err) {
//       console.error('Error fetching application:', err);
//       res.status(500).json({ error: 'Failed to load application' });
//     }
//   }
// );

// // ────────────────────────────────────────────────
// //      REJECT OFFER (CLIPPER)
// // ────────────────────────────────────────────────
// router.post(
//   '/:id/reject',
//   requireAuth,
//   requireClipper,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.id)
//         .populate('campaign');

//       if (!application) {
//         return res.status(404).json({ error: 'Application not found' });
//       }

//       if (application.clipper.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: 'Not your application' });
//       }

//       if (application.status !== 'selected') {
//         return res.status(400).json({ error: `Cannot reject in status: ${application.status}` });
//       }

//       application.status = 'rejected';
//       application.rejectedAt = new Date();
//       application.rejectedReason = 'Clipper rejected the offer';
//       await application.save();

//       // Notify advertiser
//       await new Notification({
//         user: application.campaign.advertiser,
//         type: 'offer_rejected',
//         title: 'Offer Rejected',
//         message: `The clipper has rejected your offer for "${application.campaign.title}"`,
//         data: {
//           campaignId: application.campaign._id,
//           applicationId: application._id,
//         },
//         priority: 'medium'
//       }).save();

//       res.json({ success: true, message: 'Offer rejected' });
//     } catch (err) {
//       console.error('Reject error:', err);
//       res.status(500).json({ error: err.message || 'Failed to reject offer' });
//     }
//   }
// );
// // ─────────────────────────────────────────────────────────────────────────────
// // ADD THESE TWO ENDPOINTS to routes/applications.js
// // Paste both blocks BEFORE the final `export default router;` line
// // ─────────────────────────────────────────────────────────────────────────────

// // ────────────────────────────────────────────────
// //  RAISE DISPUTE — available to both advertiser and clipper
// //  POST /api/applications/:id/dispute
// // ────────────────────────────────────────────────
// router.post(
//   '/:id/dispute',
//   requireAuth,
//   async (req, res) => {
//     try {
//       const { reason } = req.body;
//       if (!reason?.trim()) {
//         return res.status(400).json({ error: 'Please describe the issue.' });
//       }

//       const application = await Application.findById(req.params.id)
//         .populate('campaign clipper');

//       if (!application) return res.status(404).json({ error: 'Application not found' });

//       const isClipper    = application.clipper._id.toString() === req.user._id.toString();
//       const isAdvertiser = application.campaign.advertiser.toString() === req.user._id.toString();

//       if (!isClipper && !isAdvertiser) {
//         return res.status(403).json({ error: 'Access denied' });
//       }

//       if (application.disputeRaised) {
//         return res.status(400).json({ error: 'A dispute has already been raised on this application.' });
//       }

//       // Mark as disputed
//       application.disputeRaised = true;
//       application.status = 'disputed';
//       await application.save();

//       // Determine who raised and who receives counter-notification
//       const raisedBy = isClipper ? 'creator' : 'advertiser';
//       const otherParty = isClipper ? application.campaign.advertiser : application.clipper._id;

//       // Notify the other party
//       await new Notification({
//         user: otherParty,
//         type: 'dispute_raised',
//         title: '⚠️ Dispute Raised',
//         message: `A dispute has been raised on "${application.campaign.title}". Our team will review and contact both parties.`,
//         data: { campaignId: application.campaign._id, applicationId: application._id },
//         priority: 'high',
//       }).save();

//       // Notify all admins/adworkers
//       const admins = await User.find({ role: { $in: ['admin', 'adworker'] } }).select('_id').lean();
//       if (admins.length) {
//         await Notification.insertMany(admins.map((a) => ({
//           user: a._id,
//           type: 'dispute_raised',
//           title: '🚨 New Dispute',
//           message: `Dispute raised by ${raisedBy} on "${application.campaign.title}". Reason: ${reason.trim()}`,
//           data: {
//             campaignId: application.campaign._id,
//             applicationId: application._id,
//             raisedBy,
//             reason: reason.trim(),
//           },
//           priority: 'urgent',
//         })));
//       }

//       res.json({
//         success: true,
//         message: 'Dispute raised. Our team will review within 24-48 hours and contact both parties.',
//       });
//     } catch (err) {
//       console.error('Dispute error:', err);
//       res.status(500).json({ error: err.message || 'Failed to raise dispute' });
//     }
//   }
// );
// export default router;