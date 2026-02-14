// routes/applications.js
import express from 'express';
import Application from '../models/Application.js';
import Campaign from '../models/Campaign.js';
import { requireAuth, requireClipper, requireAdvertiser } from '../middleware/auth.js';
import { sendNotification } from '../utils/notifications.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Setup multer for submission uploads
const submissionDir = path.join(process.cwd(), 'uploads/submissions');
fs.mkdirSync(submissionDir, { recursive: true });

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, submissionDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  }
});
const uploadSubmission = multer({ 
  storage: submissionStorage,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB
});

// ============ CLIPPER ROUTES ============

// Apply to a campaign
router.post('/campaigns/:campaignId/apply', requireAuth, requireClipper, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const clipperId = req.user._id;

    // Check campaign exists and is active
    const campaign = await Campaign.findOne({ 
      _id: campaignId, 
      kind: 'pgc',
      status: 'active'
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or not accepting applications' });
    }

    // Check if already applied
    const existing = await Application.findOne({ campaign: campaignId, clipper: clipperId });
    if (existing) {
      return res.status(400).json({ error: 'You have already applied to this campaign' });
    }

    // Check if campaign still needs videos
    if (campaign.approvedVideosCount >= campaign.desiredVideos) {
      return res.status(400).json({ error: 'Campaign no longer accepting applications' });
    }

    // Create application
    const application = await Application.create({
      campaign: campaignId,
      clipper: clipperId,
      advertiser: campaign.advertiser,
      status: 'pending'
    });

    // Notify advertiser
    await sendNotification({
      user: campaign.advertiser,
      type: 'new_application',
      title: 'New Application Received',
      message: `${req.user.firstName || 'A clipper'} applied to your campaign "${campaign.title}"`,
      data: { campaignId, applicationId: application._id }
    });

    res.status(201).json(application);
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get my applications (clipper)
router.get('/my-applications', requireAuth, requireClipper, async (req, res) => {
  try {
    const applications = await Application.find({ clipper: req.user._id })
      .populate('campaign', 'title thumb_url desiredVideos approvedVideosCount clipper_cpm')
      .populate('advertiser', 'company contactName')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('My applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Accept offer (clipper)
router.post('/:applicationId/accept', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.clipper.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your application' });
    }

    await application.acceptOffer();

    // Notify advertiser
    await sendNotification({
      user: application.advertiser,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      message: `${req.user.firstName || 'A clipper'} accepted your offer`,
      data: { applicationId: application._id }
    });

    res.json(application);
  } catch (err) {
    console.error('Accept error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Reject offer (clipper)
router.post('/:applicationId/reject', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.clipper.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your application' });
    }

    await application.rejectOffer();

    // Notify advertiser
    await sendNotification({
      user: application.advertiser,
      type: 'offer_rejected',
      title: 'Offer Rejected',
      message: `${req.user.firstName || 'A clipper'} declined your offer`,
      data: { applicationId: application._id }
    });

    res.json(application);
  } catch (err) {
    console.error('Reject error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Submit video (clipper)
router.post('/:applicationId/submit', 
  requireAuth, 
  requireClipper, 
  uploadSubmission.fields([
    { name: 'video', maxCount: 1 },
    { name: 'files', maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      const { submissionUrl } = req.body;
      const application = await Application.findById(req.params.applicationId);
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.clipper.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your application' });
      }

      // Get video path if uploaded
      const videoFile = req.files?.video?.[0];
      const videoPath = videoFile ? `/uploads/submissions/${videoFile.filename}` : null;

      // Get additional files
      const files = req.files?.files?.map(f => `/uploads/submissions/${f.filename}`) || [];

      await application.submitVideo(submissionUrl || videoPath, files);

      // Notify advertiser
      await sendNotification({
        user: application.advertiser,
        type: 'submission_received',
        title: 'Video Submitted',
        message: `${req.user.firstName || 'A clipper'} submitted their video`,
        data: { applicationId: application._id }
      });

      res.json(application);
    } catch (err) {
      console.error('Submit error:', err);
      // Clean up uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          try { fs.unlinkSync(file.path); } catch {}
        });
      }
      res.status(400).json({ error: err.message });
    }
  }
);

// ============ ADVERTISER ROUTES ============

// Get applications for my campaigns
router.get('/campaigns/:campaignId/applications', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ 
      _id: req.params.campaignId, 
      advertiser: req.user._id 
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const applications = await Application.find({ campaign: campaign._id })
      .populate('clipper', 'firstName lastName email rating isPremiumCreator')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Shortlist an application
router.post('/applications/:applicationId/shortlist', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.campaign.advertiser.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    application.status = 'shortlisted';
    await application.save();

    res.json(application);
  } catch (err) {
    console.error('Shortlist error:', err);
    res.status(500).json({ error: 'Failed to shortlist' });
  }
});

// Send offer to clipper
router.post('/applications/:applicationId/send-offer', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.campaign.advertiser.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    // Check if campaign still needs videos
    const campaign = application.campaign;
    if (campaign.approvedVideosCount >= campaign.desiredVideos) {
      return res.status(400).json({ error: 'Campaign no longer needs videos' });
    }

    await application.sendOffer();

    // Notify clipper
    await sendNotification({
      user: application.clipper,
      type: 'offer_received',
      title: 'You Received an Offer!',
      message: `You have 2 hours to accept the offer for "${campaign.title}"`,
      data: { applicationId: application._id }
    });

    res.json(application);
  } catch (err) {
    console.error('Send offer error:', err);
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

// Request revision (advertiser)
router.post('/:applicationId/request-revision', 
  requireAuth, 
  requireAdvertiser,
  uploadSubmission.array('files', 5),
  async (req, res) => {
    try {
      const { notes } = req.body;
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.campaign.advertiser.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your campaign' });
      }

      const files = req.files?.map(f => `/uploads/submissions/${f.filename}`) || [];

      await application.requestRevision(notes, files);

      // Notify clipper
      await sendNotification({
        user: application.clipper,
        type: 'revision_requested',
        title: 'Revision Requested',
        message: `Changes requested for ${application.campaign.title}`,
        data: { applicationId: application._id }
      });

      res.json(application);
    } catch (err) {
      console.error('Request revision error:', err);
      // Clean up uploaded files
      if (req.files) {
        req.files.forEach(file => {
          try { fs.unlinkSync(file.path); } catch {}
        });
      }
      res.status(400).json({ error: err.message });
    }
  }
);

// Approve video (advertiser)
router.post('/:applicationId/approve', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.campaign.advertiser.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    await application.approve();

    // Update campaign approved count
    const campaign = application.campaign;
    campaign.approvedVideosCount += 1;
    if (campaign.approvedVideosCount >= campaign.desiredVideos) {
      campaign.status = 'completed';
    }
    await campaign.save();

    // Notify clipper
    await sendNotification({
      user: application.clipper,
      type: 'payment_received',
      title: 'Payment Received!',
      message: `₦${application.payoutAmount?.toLocaleString()} credited to your wallet`,
      data: { applicationId: application._id }
    });

    res.json(application);
  } catch (err) {
    console.error('Approve error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get single application details
router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign')
      .populate('clipper', 'firstName lastName email rating isPremiumCreator')
      .populate('advertiser', 'company contactName email');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check authorization
    const isClipper = application.clipper._id.equals(req.user._id);
    const isAdvertiser = application.advertiser._id.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isClipper && !isAdvertiser && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(application);
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

export default router;