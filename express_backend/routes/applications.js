// routes/applications.js
import express from 'express';
import Application from '../models/Application.js';
import ClipperProfile from '../models/ClipperProfile.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { requireAuth, requireClipper, requireAdvertiser, requireAdmin } from '../middleware/auth.js';
import { sendNotification, NotificationTemplates } from '../utils/notifications.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ============ FILE UPLOAD SETUP ============

// Setup multer for submission uploads
const submissionDir = path.join(process.cwd(), 'uploads/submissions');
const screenshotDir = path.join(process.cwd(), 'uploads/screenshots');
const scriptDir = path.join(process.cwd(), 'uploads/scripts');

// Create directories if they don't exist
[submissionDir, screenshotDir, scriptDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, submissionDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  }
});

const screenshotStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, screenshotDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  }
});

const scriptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, scriptDir),
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

const uploadScreenshot = multer({ 
  storage: screenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadScript = multer({ 
  storage: scriptStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Helper to get relative path
const getRelPath = (file) => file ? `/uploads/${file.destination.split('/uploads/')[1]}/${file.filename}` : null;

// ============ CLIPPER ROUTES ============

/**
 * Apply to a campaign
 * POST /api/applications/campaigns/:campaignId/apply
 */
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
      status: 'pending',
      maxRevisions: 3,
      revisionCount: 0,
      postingFulfilled: {
        whatsapp: false,
        instagram: false,
        tiktok: false,
        script: false
      }
    });

    // Increment clippers count on campaign
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { clippersCount: 1 } });

    // Get clipper name for notification
    const clipper = await User.findById(clipperId).select('firstName lastName');
    const clipperName = clipper ? `${clipper.firstName || ''} ${clipper.lastName || ''}`.trim() : 'A creator';

    // Notify advertiser
    await sendNotification({
      user: campaign.advertiser,
      ...NotificationTemplates.newApplication({
        clipperName,
        campaignTitle: campaign.title,
        campaignId,
        applicationId: application._id
      })
    });

    res.status(201).json(application);
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * Get my applications (clipper)
 * GET /api/applications/my-applications
 */
router.get('/my-applications', requireAuth, requireClipper, async (req, res) => {
  try {
    const applications = await Application.find({ clipper: req.user._id })
      .populate({
        path: 'campaign',
        select: 'title thumb_url desiredVideos approvedVideosCount clipper_cpm pgcAddons postingRequirements script ugc.brief'
      })
      .populate('advertiser', 'company contactName')
      .sort({ createdAt: -1 });

    // Add pending requirements info
    const enhancedApplications = applications.map(app => {
      const appObj = app.toObject();
      appObj.pendingRequirements = app.getPendingPostingRequirements ? app.getPendingPostingRequirements() : [];
      return appObj;
    });

    res.json(enhancedApplications);
  } catch (err) {
    console.error('My applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * Accept offer (clipper)
 * POST /api/applications/:applicationId/accept
 */
router.post('/:applicationId/accept', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.clipper.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your application' });
    }

    await application.acceptOffer();

    // Get clipper name
    const clipper = await User.findById(req.user._id).select('firstName lastName');
    const clipperName = clipper ? `${clipper.firstName || ''} ${clipper.lastName || ''}`.trim() : 'A creator';

    // Notify advertiser
    await sendNotification({
      user: application.advertiser,
      ...NotificationTemplates.offerAccepted({
        clipperName,
        campaignTitle: application.campaign.title,
        campaignId: application.campaign._id,
        applicationId: application._id
      })
    });

    res.json(application);
  } catch (err) {
    console.error('Accept error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Reject offer (clipper)
 * POST /api/applications/:applicationId/reject
 */
router.post('/:applicationId/reject', requireAuth, requireClipper, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.clipper.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your application' });
    }

    await application.rejectOffer();

    // Get clipper name
    const clipper = await User.findById(req.user._id).select('firstName lastName');
    const clipperName = clipper ? `${clipper.firstName || ''} ${clipper.lastName || ''}`.trim() : 'A creator';

    // Notify advertiser
    await sendNotification({
      user: application.advertiser,
      ...NotificationTemplates.offerRejected({
        clipperName,
        campaignTitle: application.campaign.title,
        campaignId: application.campaign._id,
        applicationId: application._id
      })
    });

    res.json(application);
  } catch (err) {
    console.error('Reject error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Submit video with post URLs and screenshots (clipper)
 * POST /api/applications/:applicationId/submit
 */
router.post('/:applicationId/submit', 
  requireAuth, 
  requireClipper, 
  uploadSubmission.fields([
    { name: 'video', maxCount: 1 },
    { name: 'files', maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      const { 
        submissionUrl,
        instagramUrl,
        tiktokUrl,
        whatsappUrl
      } = req.body;
      
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.clipper.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your application' });
      }

      // Check if within deadline
      if (application.submissionDeadline && new Date() > application.submissionDeadline) {
        return res.status(400).json({ error: 'Submission deadline has passed' });
      }

      // Get video path if uploaded
      const videoFile = req.files?.video?.[0];
      const videoPath = videoFile ? `/uploads/submissions/${videoFile.filename}` : null;

      // Get additional files
      const files = req.files?.files?.map(f => `/uploads/submissions/${f.filename}`) || [];

      // Prepare post data
      const postData = {
        postUrls: {
          instagram: instagramUrl || '',
          tiktok: tiktokUrl || '',
          whatsapp: whatsappUrl || ''
        }
      };

      await application.submitVideo(videoPath || submissionUrl, files, postData);

      // Get clipper name
      const clipper = await User.findById(req.user._id).select('firstName lastName');
      const clipperName = clipper ? `${clipper.firstName || ''} ${clipper.lastName || ''}`.trim() : 'A creator';

      // Notify advertiser
      await sendNotification({
        user: application.advertiser,
        ...NotificationTemplates.submissionReceived({
          clipperName,
          campaignTitle: application.campaign.title,
          campaignId: application.campaign._id,
          applicationId: application._id
        })
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

/**
 * Upload screenshot for WhatsApp (clipper)
 * POST /api/applications/:applicationId/screenshot
 */
router.post('/:applicationId/screenshot', 
  requireAuth, 
  requireClipper, 
  uploadScreenshot.single('screenshot'),
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.clipper.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your application' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No screenshot uploaded' });
      }

      const screenshotPath = `/uploads/screenshots/${req.file.filename}`;

      // Add screenshot to application
      application.postScreenshots = application.postScreenshots || [];
      application.postScreenshots.push({
        platform: 'whatsapp',
        url: screenshotPath,
        uploadedAt: new Date()
      });

      // Mark WhatsApp as fulfilled if required
      if (application.campaign.postingRequirements?.whatsapp) {
        application.postingFulfilled.whatsapp = true;
      }

      await application.save();

      res.json({ 
        message: 'Screenshot uploaded successfully',
        screenshot: screenshotPath,
        postingFulfilled: application.postingFulfilled
      });
    } catch (err) {
      console.error('Screenshot upload error:', err);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ error: 'Failed to upload screenshot' });
    }
  }
);

/**
 * Add creator script (if script add-on selected)
 * POST /api/applications/:applicationId/script
 */
router.post('/:applicationId/script', 
  requireAuth, 
  requireClipper, 
  uploadScript.single('script'),
  async (req, res) => {
    try {
      const { scriptText } = req.body;
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign');
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.clipper.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your application' });
      }

      // Check if script add-on is selected
      if (!application.campaign.pgcAddons?.includes('script')) {
        return res.status(400).json({ error: 'This campaign does not require a script' });
      }

      let scriptContent = scriptText;
      
      // If file uploaded, read it or store path
      if (req.file) {
        const scriptPath = `/uploads/scripts/${req.file.filename}`;
        scriptContent = scriptPath;
      }

      if (!scriptContent) {
        return res.status(400).json({ error: 'Please provide script text or upload a file' });
      }

      await application.addCreatorScript(scriptContent);

      res.json({ 
        message: 'Script submitted successfully',
        postingFulfilled: application.postingFulfilled
      });
    } catch (err) {
      console.error('Script upload error:', err);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ error: 'Failed to submit script' });
    }
  }
);

// ============ ADVERTISER ROUTES ============

/**
 * Get all applications for advertiser's campaigns
 * GET /api/applications/advertiser/all
 */

router.get(
  '/advertiser/all',
  requireAuth,
  requireAdvertiser,
  async (req, res) => {
    try {
      const { status, campaignId, page, limit } = req.query;

      // Build query
      let query = { advertiser: req.user._id };

      if (status) {
        query.status = status;
      }

      if (campaignId) {
        query.campaign = campaignId;
      }

      // ==============================
      // PAGINATION
      // ==============================
      if (page && limit) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get applications with basic population first
        const applications = await Application.find(query)
          .populate({
            path: 'campaign',
            select: 'title kind thumb_url clipper_cpm budget_total budget_remaining desiredVideos approvedVideosCount pgcAddons postingRequirements script ugc'
          })
          .populate({
            path: 'clipper',
            select: 'firstName lastName email phone country rating isPremiumCreator profileImage'
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();

        // Manually fetch clipper profiles for each application
        const applicationsWithProfiles = await Promise.all(
          applications.map(async (app) => {
            if (app.clipper && app.clipper._id) {
              try {
                const clipperProfile = await ClipperProfile.findOne({ 
                  user: app.clipper._id 
                }).lean();
                
                // Add the profile directly to the clipper object
                app.clipper.clipperProfile = clipperProfile || null;
              } catch (profileErr) {
                console.error(`Error fetching profile for clipper ${app.clipper._id}:`, profileErr);
                app.clipper.clipperProfile = null;
              }
            }
            return app;
          })
        );

        const total = await Application.countDocuments(query);

        return res.json({
          success: true,
          applications: applicationsWithProfiles,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        });
      }

      // ==============================
      // NO PAGINATION
      // ==============================
      const applications = await Application.find(query)
        .populate({
          path: 'campaign',
          select: 'title kind thumb_url clipper_cpm budget_total budget_remaining desiredVideos approvedVideosCount pgcAddons postingRequirements script ugc'
        })
        .populate({
          path: 'clipper',
          select: 'firstName lastName email phone country rating isPremiumCreator profileImage'
        })
        .sort({ createdAt: -1 })
        .lean();

      // Manually fetch clipper profiles for each application
      const applicationsWithProfiles = await Promise.all(
        applications.map(async (app) => {
          if (app.clipper && app.clipper._id) {
            try {
              const clipperProfile = await ClipperProfile.findOne({ 
                user: app.clipper._id 
              }).lean();
              
              // Add the profile directly to the clipper object
              app.clipper.clipperProfile = clipperProfile || null;
            } catch (profileErr) {
              console.error(`Error fetching profile for clipper ${app.clipper._id}:`, profileErr);
              app.clipper.clipperProfile = null;
            }
          }
          return app;
        })
      );

      return res.json({
        success: true,
        applications: applicationsWithProfiles,
      });

    } catch (err) {
      console.error('Error fetching advertiser applications:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch applications',
      });
    }
  }
);

// router.get('/advertiser/all', requireAuth, requireAdvertiser, async (req, res) => {
//   try {
//     const { status, campaignId, page, limit } = req.query;
    
//     let query = { advertiser: req.user._id };
    
//     if (status) {
//       query.status = status;
//     }
    
//     if (campaignId) {
//       query.campaign = campaignId;
//     }

//     // If page and limit are provided, use pagination
//     if (page && limit) {
//       const skip = (parseInt(page) - 1) * parseInt(limit);

//       const applications = await Application.find(query)
//         .populate({
//           path: 'campaign',
//           select: 'title kind clipper_cpm desiredVideos approvedVideosCount pgcAddons postingRequirements script ugc.brief thumb_url'
//         })
//         .populate('clipper', 'firstName lastName email rating isPremiumCreator profileImage')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit));

//       const total = await Application.countDocuments(query);

//       return res.json({
//         applications,
//         pagination: {
//           page: parseInt(page),
//           limit: parseInt(limit),
//           total,
//           pages: Math.ceil(total / parseInt(limit))
//         }
//       });
//     } else {
//       // If no pagination params, return just the array
//       const applications = await Application.find(query)
//         .populate({
//           path: 'campaign',
//           select: 'title kind clipper_cpm desiredVideos approvedVideosCount pgcAddons postingRequirements script ugc.brief thumb_url'
//         })
//         .populate('clipper', 'firstName lastName email rating isPremiumCreator profileImage')
//         .sort({ createdAt: -1 });

//       return res.json(applications);
//     }
//   } catch (err) {
//     console.error('Error fetching advertiser applications:', err);
//     res.status(500).json({ error: 'Failed to fetch applications' });
//   }
// });
/**
 * Get count of pending applications for advertiser (for badge)
 * GET /api/applications/advertiser/pending-count
 */
router.get('/advertiser/pending-count', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const count = await Application.countDocuments({
      advertiser: req.user._id,
      status: { $in: ['pending', 'submitted'] } // Count pending and submitted as "needs attention"
    });
    
    res.json({ count });
  } catch (err) {
    console.error('Error fetching pending count:', err);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

/**
 * Get applications for a specific campaign
 * GET /api/applications/campaign/:campaignId
 */
router.get('/campaign/:campaignId', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    // Verify campaign belongs to advertiser
    const campaign = await Campaign.findOne({ 
      _id: req.params.campaignId, 
      advertiser: req.user._id 
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const applications = await Application.find({ 
      campaign: req.params.campaignId,
      advertiser: req.user._id 
    })
    .populate('clipper', 'firstName lastName email rating isPremiumCreator profileImage')
    .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error('Error fetching campaign applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * Shortlist an application
 * POST /api/applications/:applicationId/shortlist
 */
router.post('/:applicationId/shortlist', requireAuth, requireAdvertiser, async (req, res) => {
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

/**
 * Send offer to clipper
 * POST /api/applications/:applicationId/send-offer
 */
router.post('/:applicationId/send-offer', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign')
      .populate('clipper', 'firstName lastName');
    
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
      user: application.clipper._id,
      ...NotificationTemplates.offerReceived({
        campaignTitle: campaign.title,
        campaignId: campaign._id,
        applicationId: application._id,
        amount: campaign.clipper_cpm
      })
    });

    res.json(application);
  } catch (err) {
    console.error('Send offer error:', err);
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

/**
 * Request revision (advertiser)
 * POST /api/applications/:applicationId/request-revision
 */
router.post('/:applicationId/request-revision', 
  requireAuth, 
  requireAdvertiser,
  uploadSubmission.array('files', 5),
  async (req, res) => {
    try {
      const { notes } = req.body;
      const application = await Application.findById(req.params.applicationId)
        .populate('campaign')
        .populate('clipper', 'firstName lastName');
      
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (!application.campaign.advertiser.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not your campaign' });
      }

      // Check if max revisions reached
      if (application.revisionCount >= application.maxRevisions) {
        return res.status(400).json({ error: 'Maximum revisions reached' });
      }

      const files = req.files?.map(f => `/uploads/submissions/${f.filename}`) || [];

      await application.requestRevision(notes, files);

      // Notify clipper
      await sendNotification({
        user: application.clipper._id,
        ...NotificationTemplates.revisionRequested({
          campaignTitle: application.campaign.title,
          campaignId: application.campaign._id,
          applicationId: application._id,
          notes
        })
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

/**
 * Approve video (advertiser) - releases payment
 * POST /api/applications/:applicationId/approve
 */
router.post('/:applicationId/approve', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign')
      .populate('clipper');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.campaign.advertiser.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    // Check if all posting requirements are met
    try {
      application.checkPostingRequirements();
    } catch (reqError) {
      return res.status(400).json({ error: reqError.message });
    }

    await application.approve();

    // Update campaign approved count
    const campaign = application.campaign;
    campaign.approvedVideosCount += 1;
    if (campaign.approvedVideosCount >= campaign.desiredVideos) {
      campaign.status = 'completed';
    }
    await campaign.save();

    // Get payout amount from campaign
    const payoutAmount = campaign.clipper_cpm;

    // Notify clipper
    await sendNotification({
      user: application.clipper._id,
      ...NotificationTemplates.paymentReceived({
        campaignTitle: campaign.title,
        campaignId: campaign._id,
        applicationId: application._id,
        transactionId: application.transactionId,
        amount: payoutAmount
      })
    });

    res.json({
      message: 'Video approved and payment sent',
      application
    });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Reject application (advertiser)
 * POST /api/applications/:applicationId/reject
 */
router.post('/:applicationId/reject', requireAuth, requireAdvertiser, async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign')
      .populate('clipper', 'firstName lastName');
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!application.campaign.advertiser.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not your campaign' });
    }

    application.status = 'rejected';
    application.notes = reason;
    await application.save();

    // Notify clipper
    await sendNotification({
      user: application.clipper._id,
      type: 'application_rejected',
      title: 'Application Update',
      message: `Your application for "${application.campaign.title}" was not selected`,
      data: { 
        campaignId: application.campaign._id,
        applicationId: application._id,
        reason 
      }
    });

    res.json(application);
  } catch (err) {
    console.error('Reject application error:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// ============ SHARED ROUTES ============

/**
 * Get single application details
 * GET /api/applications/:applicationId
 */
router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .populate({
        path: 'campaign',
        select: 'title kind clipper_cpm desiredVideos approvedVideosCount pgcAddons postingRequirements script ugc brief directions hashtags categories platforms cta_url'
      })
      .populate('clipper', 'firstName lastName email phone rating isPremiumCreator profileImage')
      .populate('advertiser', 'company contactName email phone');

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

    // Add pending requirements for clipper view
    const appObj = application.toObject();
    if (isClipper && application.getPendingPostingRequirements) {
      appObj.pendingRequirements = application.getPendingPostingRequirements();
    }

    res.json(appObj);
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

/**
 * Get application statistics for dashboard
 * GET /api/applications/stats/dashboard
 */
router.get('/stats/dashboard', requireAuth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'clipper') {
      query.clipper = req.user._id;
    } else if (req.user.role === 'advertiser') {
      query.advertiser = req.user._id;
    }

    const stats = await Application.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      shortlisted: 0,
      offer_sent: 0,
      accepted: 0,
      working: 0,
      submitted: 0,
      revision_requested: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      expired: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    // Add derived stats
    formattedStats.total = Object.values(formattedStats).reduce((a, b) => a + b, 0);
    formattedStats.needsAction = formattedStats.pending + formattedStats.submitted;

    res.json(formattedStats);
  } catch (err) {
    console.error('Error fetching application stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Add message to application (chat)
 * POST /api/applications/:applicationId/messages
 */
router.post('/:applicationId/messages', requireAuth, uploadSubmission.array('files', 3), async (req, res) => {
  try {
    const { content } = req.body;
    const application = await Application.findById(req.params.applicationId);
    
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Check authorization
    const isClipper = application.clipper.equals(req.user._id);
    const isAdvertiser = application.advertiser.equals(req.user._id);
    
    if (!isClipper && !isAdvertiser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = req.files?.map(f => `/uploads/submissions/${f.filename}`) || [];

    application.messages = application.messages || [];
    application.messages.push({
      sender: req.user._id,
      content,
      files,
      createdAt: new Date()
    });

    await application.save();

    // Notify the other party
    const notifyUser = isClipper ? application.advertiser : application.clipper;
    
    await sendNotification({
      user: notifyUser,
      type: 'new_message',
      title: 'New Message',
      message: `You have a new message about your application`,
      data: { applicationId: application._id }
    });

    res.json(application.messages[application.messages.length - 1]);
  } catch (err) {
    console.error('Error adding message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Get messages for application
 * GET /api/applications/:applicationId/messages
 */
router.get('/:applicationId/messages', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId)
      .select('messages')
      .populate('messages.sender', 'firstName lastName role');

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Check authorization
    const isClipper = application.clipper.equals(req.user._id);
    const isAdvertiser = application.advertiser.equals(req.user._id);
    
    if (!isClipper && !isAdvertiser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(application.messages || []);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ============ ADMIN ROUTES ============

/**
 * Get all applications (admin only)
 * GET /api/applications/admin/all
 */
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find({})
      .populate('campaign', 'title advertiser')
      .populate('clipper', 'firstName lastName email')
      .populate('advertiser', 'company contactName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments();

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching all applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * Admin resolve dispute
 * POST /api/applications/:applicationId/resolve-dispute
 */
router.post('/:applicationId/resolve-dispute', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { resolution, notes } = req.body;
    const application = await Application.findById(req.params.applicationId)
      .populate('campaign')
      .populate('clipper')
      .populate('advertiser');

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Handle resolution
    if (resolution === 'approve') {
      // Force approve and pay clipper
      await application.approve();
    } else if (resolution === 'reject') {
      // Reject and refund advertiser
      application.status = 'cancelled';
      application.notes = `Admin resolved: ${notes}`;
      
      // Refund advertiser
      const campaign = application.campaign;
      const advertiserWallet = await Wallet.findOne({ user: application.advertiser._id });
      if (advertiserWallet) {
        advertiserWallet.balance += campaign.budget_remaining;
        advertiserWallet.escrowLocked -= campaign.budget_remaining;
        await advertiserWallet.save();
      }
    }

    await application.save();

    // Notify both parties
    await sendNotification({
      user: application.clipper._id,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `Your dispute has been resolved. ${notes || ''}`,
      data: { applicationId: application._id }
    });

    await sendNotification({
      user: application.advertiser._id,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `Your dispute has been resolved. ${notes || ''}`,
      data: { applicationId: application._id }
    });

    res.json({ message: 'Dispute resolved', application });
  } catch (err) {
    console.error('Error resolving dispute:', err);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;