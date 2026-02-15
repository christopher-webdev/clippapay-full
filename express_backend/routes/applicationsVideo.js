// routes/applicationsVideo.js
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const Application = mongoose.model('Application');
const Notification = mongoose.model('Notification');

// ─────────────────────────────────────────────
// Multer setup for video uploads
// ─────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads/application-videos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB
});


// ─────────────────────────────────────────────
// CLIPPER → SUBMIT VIDEO
// POST /api/applications/:id/submit
// ─────────────────────────────────────────────
router.post('/:id/submit', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.clipper) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Video file required' });
    }

    const videoPath = `/uploads/application-videos/${req.file.filename}`;

    const { instagram, tiktok } = req.body;

    await app.submitVideo(videoPath, {
      postUrls: {
        instagram: instagram || '',
        tiktok: tiktok || ''
      }
    });

    // Notify advertiser
    await Notification.create({
      user: app.advertiser,
      type: 'submission_received',
      title: 'Video Submitted 🎥',
      message: `A video has been submitted for review.`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// CLIPPER → UPLOAD WHATSAPP SCREENSHOT
// POST /api/applications/:id/screenshot
// ─────────────────────────────────────────────
router.post('/:id/screenshot', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.clipper) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Screenshot required' });
    }

    const imagePath = `/uploads/application-videos/${req.file.filename}`;

    app.postScreenshots.push({
      platform: 'whatsapp',
      url: imagePath
    });

    await app.save();

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// ADVERTISER → REQUEST VIDEO REVISION
// POST /api/applications/:id/request-revision
// ─────────────────────────────────────────────
router.post('/:id/request-revision', requireAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes?.trim()) {
      return res.status(400).json({ error: 'Revision notes required' });
    }

    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.advertiser) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await app.requestRevision(notes);

    // Notify clipper
    await Notification.create({
      user: app.clipper,
      type: 'revision_requested',
      title: 'Revision Requested ✏️',
      message: `Changes were requested for your video.`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// ADVERTISER → APPROVE & PAY
// POST /api/applications/:id/approve
// ─────────────────────────────────────────────
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.advertiser) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await app.approveAndPay();

    // Notify clipper
    await Notification.create({
      user: app.clipper,
      type: 'payment_received',
      title: 'Payment Received 💰',
      message: `Your payment has been released.`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
