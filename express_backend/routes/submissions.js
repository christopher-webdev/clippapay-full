// File: express_backend/routes/submissions.js

import express from 'express';
import Submission from '../models/Submission.js';
import Campaign from '../models/Campaign.js';
import {
  requireAuth,
  requireClipper,
  requireAdvertiser
} from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/submissions
 * Clippers post a new submission
 */
router.post(
  '/',
  requireAuth,
  requireClipper,
  async (req, res) => {
    try {
      const { campaign_id, proof_url, platform } = req.body;
      const submission = await Submission.create({
        clipper_id: req.user._id,
        campaign_id,
        proof_url,
        platform
      });
      res.status(201).json(submission);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error creating submission.' });
    }
  }
);

/**
 * GET /api/submissions
 * Clippers see their own submissions; advertisers see submissions on their campaigns
 */
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      if (req.user.role === 'clipper') {
        const list = await Submission.find({ clipper_id: req.user._id });
        return res.json(list);
      }

      if (req.user.role === 'advertiser') {
        const camps = await Campaign.find({ advertiser_id: req.user._id });
        const campIds = camps.map(c => c._id);
        const list = await Submission.find({ campaign_id: { $in: campIds } });
        return res.json(list);
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching submissions.' });
    }
  }
);

export default router;
