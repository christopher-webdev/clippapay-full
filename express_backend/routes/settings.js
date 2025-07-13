// File: express_backend/routes/settings.js

import express from 'express';
import PlatformSetting from '../models/PlatformSetting.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/settings
 * Return all platform settings as key/value pairs.
 */
router.get(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const settings = await PlatformSetting.find({});
      const output = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      res.json(output);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  }
);

/**
 * PUT /api/admin/settings
 * Accepts a JSON object of key/value pairs and upserts each setting.
 */
router.put(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const entries = Object.entries(req.body);
      const updated = {};

      for (const [key, value] of entries) {
        const doc = await PlatformSetting.findOneAndUpdate(
          { key },
          { value },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        updated[doc.key] = doc.value;
      }

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  }
);

export default router;
