// File: express_backend/routes/platformSettings.js

import express from 'express';
import PlatformSetting from '../models/PlatformSetting.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * GET /api/platform-settings
 * Get all platform settings (admin only)
 */
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const settings = await PlatformSetting.find().sort('key');
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/platform-settings
 * Update multiple platform settings (admin only)
 */
router.put('/', requireAdminAuth, async (req, res) => {
  try {
    const updates = req.body;
    const results = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const setting = await PlatformSetting.findOneAndUpdate(
        { key },
        { 
          value: value.toString(),
          updatedBy: req.user._id 
        },
        { upsert: true, new: true }
      );
      results.push(setting);
    }
    
    res.json({ 
      message: 'Settings updated successfully',
      settings: results 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/platform-settings/public
 * Get public platform settings (no auth required)
 */
router.get('/public', async (req, res) => {
  try {
    const settings = await PlatformSetting.find({
      key: { 
        $in: [
          'bankName',
          'bankAccountNumber',
          'bankAccountName',
          'usdtAddress',
          'usdtNetwork',
          'usdtMinDeposit',
          'ngnMinDeposit'
        ] 
      }
    }).lean();

    const result = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch platform details' });
  }
});

export default router;