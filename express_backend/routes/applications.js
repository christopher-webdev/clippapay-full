// routes/applications.js
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
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// ────────────────────────────────────────────────
//              MULTER CONFIG – VIDEO SUBMISSIONS
// ────────────────────────────────────────────────
const videoUploadDir = path.join(process.cwd(), 'uploads/videos');
await fs.mkdir(videoUploadDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoUploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — adjust as needed
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files allowed (mp4, mov, webm)'), false);
  }
});

// ────────────────────────────────────────────────
//      CLIPPER APPLIES TO A CAMPAIGN
// ────────────────────────────────────────────────
router.post(
  '/:campaignId/apply',
  requireAuth,
  requireClipper,
  async (req, res) => {
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

      // Prevent duplicate applications
      const existing = await Application.findOne({
        campaign: campaignId,
        clipper: req.user._id
      });
      if (existing) {
        return res.status(400).json({ error: 'You have already applied to this campaign' });
      }

      const application = new Application({
        campaign: campaignId,
        clipper: req.user._id,
        proposedRateNGN: proposedRateNGN ? Number(proposedRateNGN) : undefined,
        proposedRateUSDT: proposedRateUSDT ? Number(proposedRateUSDT) : undefined,
        note: note?.trim(),
      });

      await application.save();

      // Notify advertiser
      await new Notification({
        user: campaign.advertiser,
        type: 'new_application',
        title: 'New Application Received',
        message: `A clipper has applied to your campaign "${campaign.title}"`,
        data: { campaignId: campaign._id, applicationId: application._id },
        priority: 'medium'
      }).save();

      res.status(201).json({ success: true, application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }
);

// ────────────────────────────────────────────────
//      ADVERTISER GETS ALL APPLICATIONS FOR THEIR CAMPAIGN
// ────────────────────────────────────────────────
router.get(
  '/campaign/:campaignId',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.campaignId,
        advertiser: req.user._id
      });

      if (!campaign) return res.status(404).json({ error: 'Campaign not found or not yours' });

      const applications = await Application.find({ campaign: campaign._id })
        .populate('clipper', 'firstName lastName profileImage rating sampleVideos bio categories')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        campaign: { title: campaign.title },
        applications,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load applications' });
    }
  }
);

// ────────────────────────────────────────────────
//      ADVERTISER SELECTS A CLIPPER → LOCK ESCROW
// ────────────────────────────────────────────────
router.post(
  '/:applicationId/select',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { currency } = req.body; // 'NGN' or 'USDT'
      if (!['NGN', 'USDT'].includes(currency)) {
        return res.status(400).json({ error: 'Currency must be NGN or USDT' });
      }

      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');

      if (!application) return res.status(404).json({ error: 'Application not found' });

      const campaign = application.campaign;
      if (campaign.advertiser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your campaign' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ error: `Application already in status: ${application.status}` });
      }

      if (campaign.status !== 'active') {
        return res.status(400).json({ error: 'Campaign no longer active' });
      }

      // Determine amount to lock
      let amount;
      if (currency === 'NGN') {
        amount = application.proposedRateNGN;
        if (!amount || amount <= 0) {
          return res.status(400).json({ error: 'Clipper did not propose NGN rate' });
        }
      } else {
        amount = application.proposedRateUSDT;
        if (!amount || amount <= 0) {
          return res.status(400).json({ error: 'Clipper did not propose USDT rate' });
        }
      }

      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

      // Lock escrow
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

      // Select application
      await application.select(currency, amount);

      // Auto-reject all other pending applications for this campaign
      await Application.updateMany(
        {
          campaign: campaign._id,
          _id: { $ne: application._id },
          status: 'pending'
        },
        { $set: { status: 'rejected', rejectedAt: new Date(), rejectedReason: 'Another clipper was selected' } }
      );

      // Notify selected clipper
      await new Notification({
        user: application.clipper,
        type: 'offer_received',
        title: 'You’ve Been Selected!',
        message: `The advertiser selected you for "${campaign.title}". You have 2 hours to accept. Amount: ${currency === 'NGN' ? '₦' : ''}${amount}${currency === 'USDT' ? ' USDT' : ''}`,
        data: {
          campaignId: campaign._id,
          applicationId: application._id,
          amount,
          currency
        },
        priority: 'high'
      }).save();

      // Create transaction record for escrow lock (using valid enum)
      try {
        await new Transaction({
          user: req.user._id,
          type: 'payment', // Valid enum: 'payment'
          amount,
          currency,
          status: 'completed',
          reference: `app:${application._id}`,
          note: `Escrow locked for campaign "${campaign.title}"`,
          metadata: {
            campaignId: campaign._id,
            applicationId: application._id,
            clipperId: application.clipper,
            action: 'escrow_lock',
            status: 'pending_delivery'
          }
        }).save();
      } catch (txError) {
        // Log but don't fail - transaction recording is non-critical
        console.warn('Transaction recording warning:', txError.message);
      }

      res.json({ success: true, application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to select clipper' });
    }
  }
);

// ────────────────────────────────────────────────
//      CLIPPER ACCEPTS THE OFFER (within 2 hours)
// ────────────────────────────────────────────────
router.post(
  '/:applicationId/accept',
  requireAuth,
  requireClipper,
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');

      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (application.clipper.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your application' });
      }

      await application.acceptOffer();

      // Notify advertiser
      await new Notification({
        user: application.campaign.advertiser,
        type: 'offer_accepted',
        title: 'Clipper Accepted Your Offer',
        message: `The selected clipper has accepted your offer for "${application.campaign.title}". They have 48 hours to deliver.`,
        data: { campaignId: application.campaign._id, applicationId: application._id },
        priority: 'high'
      }).save();

      res.json({ success: true, application });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to accept offer' });
    }
  }
);

// ────────────────────────────────────────────────
//      CLIPPER SUBMITS VIDEO (or resubmits after revision)
// ────────────────────────────────────────────────
// POST /api/applications/:id/submit
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

//       if (application.status !== 'accepted') {
//         return res.status(400).json({ error: 'Can only submit after accepting offer' });
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

//       // Notify advertiser
//       await new Notification({
//         user: application.campaign.advertiser,
//         type: 'submission_received',
//         title: 'Video Submitted',
//         message: `Clipper submitted video for "${application.campaign.title}"`,
//         data: {
//           campaignId: application.campaign._id,
//           applicationId: application._id,
//           videoUrl: videoPath,
//           note: submissionNote,
//         },
//         priority: 'high',
//       }).save();

//       res.json({ success: true, message: 'Video submitted successfully' });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to submit video' });
//     }
//   }
// );
// routes/applications.js - Update the submit endpoint

// POST /api/applications/:id/submit
router.post(
  '/:id/submit',
  requireAuth,
  requireClipper,
  videoUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate('campaign');

      if (!application) return res.status(404).json({ error: 'Not found' });

      if (application.clipper.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your application' });
      }

      if (application.status !== 'accepted' && application.status !== 'revision_requested') {
        return res.status(400).json({ error: 'Can only submit after accepting offer or revision request' });
      }

      if (!req.files?.video?.[0]) {
        return res.status(400).json({ error: 'Video file is required' });
      }

      const videoPath = `/uploads/videos/${req.files.video[0].filename}`;
      let thumbnailPath = null;

      if (req.files.thumbnail?.[0]) {
        thumbnailPath = `/uploads/videos/${req.files.thumbnail[0].filename}`;
      }

      // Optional note
      const submissionNote = req.body.note?.trim();

      await application.submitVideo(videoPath, thumbnailPath);

      // Add submission to campaign
      await application.campaign.addVideoSubmission(
        application._id,
        req.user._id,
        videoPath,
        thumbnailPath
      );

      // Notify advertiser
      await new Notification({
        user: application.campaign.advertiser,
        type: 'submission_received',
        title: application.status === 'revision_requested' ? 'Revised Video Submitted' : 'Video Submitted',
        message: `Clipper ${application.status === 'revision_requested' ? 'resubmitted' : 'submitted'} video for "${application.campaign.title}"`,
        data: {
          campaignId: application.campaign._id,
          applicationId: application._id,
          videoUrl: videoPath,
          note: submissionNote,
          revisionCount: application.revisionCount
        },
        priority: 'high',
      }).save();

      res.json({ 
        success: true, 
        message: 'Video submitted successfully',
        campaignStatus: application.campaign.status 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit video' });
    }
  }
);
// ────────────────────────────────────────────────
//      ADVERTISER REQUESTS REVISION (max 3)
// ────────────────────────────────────────────────
router.post(
  '/:applicationId/revision',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { feedback } = req.body;
      if (!feedback?.trim()) {
        return res.status(400).json({ error: 'Feedback is required for revision' });
      }

      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');

      if (!application) return res.status(404).json({ error: 'Not found' });

      if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your campaign' });
      }

      await application.requestRevision(feedback.trim());

      // Notify clipper
      await new Notification({
        user: application.clipper,
        type: 'revision_requested',
        title: 'Revision Requested',
        message: `The advertiser requested changes to your submission for "${application.campaign.title}" (revision ${application.revisionCount})`,
        data: {
          campaignId: application.campaign._id,
          applicationId: application._id,
          feedback: application.lastFeedback
        },
        priority: 'high'
      }).save();

      res.json({ success: true, application });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to request revision' });
    }
  }
);

// ────────────────────────────────────────────────
//      ADVERTISER APPROVES FINAL VIDEO → RELEASE ESCROW
// ────────────────────────────────────────────────
router.post(
  '/:applicationId/approve',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign clipper');

      if (!application) return res.status(404).json({ error: 'Not found' });

      if (application.campaign.advertiser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not yours' });
      }

      await application.approve();

      // Release escrow to clipper
      const walletAdvertiser = await Wallet.findOne({ user: req.user._id });
      let walletClipper = await Wallet.findOne({ user: application.clipper._id });

      if (!walletClipper) {
        // edge case — create wallet if missing
        walletClipper = await Wallet.create({ user: application.clipper._id });
      }

      let amount = application.paymentAmount;
      if (application.paymentCurrency === 'NGN') {
        await walletAdvertiser.releaseEscrowNGN(amount);
        await walletClipper.creditNGN(amount);
      } else {
        await walletAdvertiser.releaseEscrowUSDT(amount);
        await walletClipper.creditUSDT(amount);
      }

      // Record payout transaction for clipper
      try {
        await new Transaction({
          user: application.clipper._id,
          type: 'payment', // Using 'payment' for receiving funds
          amount,
          currency: application.paymentCurrency,
          status: 'completed',
          reference: `app:${application._id}`,
          note: `Payment for approved video in "${application.campaign.title}"`,
          metadata: {
            campaignId: application.campaign._id,
            applicationId: application._id,
            action: 'payment_release',
            fromAdvertiser: req.user._id
          }
        }).save();

        // Record transaction for advertiser (funds released)
        await new Transaction({
          user: req.user._id,
          type: 'withdrawal', // Valid enum: 'withdrawal'
          amount,
          currency: application.paymentCurrency,
          status: 'completed',
          reference: `app:${application._id}`,
          note: `Payment released to clipper for "${application.campaign.title}"`,
          metadata: {
            campaignId: application.campaign._id,
            applicationId: application._id,
            action: 'escrow_release',
            toClipper: application.clipper._id
          }
        }).save();
      } catch (txError) {
        console.warn('Transaction recording warning:', txError.message);
      }

      // Notify clipper
      await new Notification({
        user: application.clipper._id,
        type: 'payment_received',
        title: 'Payment Received!',
        message: `Your video for "${application.campaign.title}" was approved. ${application.paymentCurrency === 'NGN' ? '₦' : ''}${amount}${application.paymentCurrency === 'USDT' ? ' USDT' : ''} has been credited to your wallet.`,
        data: { 
          applicationId: application._id, 
          amount, 
          currency: application.paymentCurrency 
        },
        priority: 'high'
      }).save();

      // Mark campaign as completed if this was the only/one active application
      await application.campaign.markCompleted();

      res.json({ success: true, application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Approval failed' });
    }
  }
);

// ────────────────────────────────────────────────
//      GET CLIPPER'S APPLICATIONS
// ────────────────────────────────────────────────
router.get('/my', requireAuth, requireClipper, async (req, res) => {
  try {
    const applications = await Application.find({ clipper: req.user._id })
      .populate({
        path: 'campaign',
        select: 'title thumbnailUrl category preferredLength applicationDeadline advertiser',
        populate: {
          path: 'advertiser',
          select: 'firstName lastName company profileImage rating',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// Add this to routes/applications.js

// ────────────────────────────────────────────────
//      GET SINGLE APPLICATION BY ID
// ────────────────────────────────────────────────
// router.get(
//   '/:id',
//   requireAuth,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.id)
//         .populate({
//           path: 'campaign',
//           select: 'title thumbnailUrl category preferredLength applicationDeadline advertiser',
//           populate: {
//             path: 'advertiser',
//             select: 'firstName lastName company profileImage',
//           },
//         })
//         .populate('clipper', 'firstName lastName profileImage');

//       if (!application) {
//         return res.status(404).json({ error: 'Application not found' });
//       }

//       // Check if user is either the clipper or the advertiser
//       const isClipper = application.clipper._id.toString() === req.user._id.toString();
//       const isAdvertiser = application.campaign?.advertiser?._id?.toString() === req.user._id.toString();

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
router.get(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate({
          path: 'campaign',
          select: `
            title 
            description
            script
            thumbnailUrl 
            category 
            preferredLength 
            applicationDeadline 
            creativeDirection
            advertiser
          `,
          populate: {
            path: 'advertiser',
            select: 'firstName lastName company profileImage rating',
          },
        })
        .populate('clipper', 'firstName lastName profileImage');

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const isClipper =
        application.clipper._id.toString() === req.user._id.toString();

      const isAdvertiser =
        application.campaign?.advertiser?._id?.toString() ===
        req.user._id.toString();

      if (!isClipper && !isAdvertiser) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ success: true, application });
    } catch (err) {
      console.error('Error fetching application:', err);
      res.status(500).json({ error: 'Failed to load application' });
    }
  }
);

// ────────────────────────────────────────────────
//      REJECT OFFER (CLIPPER)
// ────────────────────────────────────────────────
router.post(
  '/:id/reject',
  requireAuth,
  requireClipper,
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.id)
        .populate('campaign');

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (application.clipper.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your application' });
      }

      if (application.status !== 'selected') {
        return res.status(400).json({ error: `Cannot reject in status: ${application.status}` });
      }

      application.status = 'rejected';
      application.rejectedAt = new Date();
      application.rejectedReason = 'Clipper rejected the offer';
      await application.save();

      // Notify advertiser
      await new Notification({
        user: application.campaign.advertiser,
        type: 'offer_rejected',
        title: 'Offer Rejected',
        message: `The clipper has rejected your offer for "${application.campaign.title}"`,
        data: {
          campaignId: application.campaign._id,
          applicationId: application._id,
        },
        priority: 'medium'
      }).save();

      res.json({ success: true, message: 'Offer rejected' });
    } catch (err) {
      console.error('Reject error:', err);
      res.status(500).json({ error: err.message || 'Failed to reject offer' });
    }
  }
);
export default router;