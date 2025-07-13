import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Campaign from '../models/Campaign.js';
import Clip from '../models/Clip.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ensure uploads/clips exists
const clipDir = path.join(process.cwd(), 'uploads/clips');
fs.mkdirSync(clipDir, { recursive: true });

// multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, clipDir),
  filename:   (_req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const uniq   = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, uniq + ext);
  }
});
const upload = multer({ storage });

/**
 * GET /api/campaigns/:id/clips
 * - Ad-workers see clips on their assigned campaign (any status)
 * - Clippers & Advertisers see clips only if adWorkerStatus === 'ready'
 */
router.get(
  '/:id/clips',
  requireAuth,
  async (req, res) => {
    const camp = await Campaign.findById(req.params.id);
    if (!camp) return res.status(404).json({ error: 'Campaign not found.' });

    if (req.user.role === 'ad-worker') {
      if (!camp.assignedWorker.equals(req.user._id)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else {
      // advertiser or clipper
      if (camp.adWorkerStatus !== 'ready') {
        return res.status(403).json({ error: 'Clips not ready yet.' });
      }
    }

    const clips = await Clip.find({ campaign: camp._id }).populate('adWorker','email');
    return res.json(clips);
  }
);

/**
 * POST /api/campaigns/:id/clips
 * Ad-worker uploads 1–6 clips for their assigned campaign
 * Field name must be "clips"
 */
router.post(
  '/:id/clips',
  requireAuth,
  upload.array('clips', 6),
  async (req, res) => {
    try {
      const camp = await Campaign.findById(req.params.id);
      if (!camp) return res.status(404).json({ error: 'Campaign not found.' });

      if (req.user.role !== 'ad-worker' ||
          !camp.assignedWorker.equals(req.user._id)) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const saved = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const url  = `/uploads/clips/${file.filename}`;
        const clip = new Clip({
          campaign: camp._id,
          adWorker: req.user._id,
          url,
          index: i + 1
        });
        await clip.save();
        saved.push(clip);
      }

      camp.adWorkerStatus = 'ready';
      camp.status = 'active';
      await camp.save();

      return res.status(201).json(saved);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error uploading clips.' });
    }
  }
);

export default router;
