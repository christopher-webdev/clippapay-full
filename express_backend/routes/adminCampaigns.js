import express from 'express';
import Campaign from '../models/Campaign.js';
import ClipSubmission from '../models/ClipSubmission.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'
import fs from 'fs/promises';
import path from 'path';
import Wallet from '../models/Wallet.js';

const router = express.Router();

// --- GET ALL CAMPAIGNS (with stats) ---
router.get('/', requireAdminAuth,  async (req, res) => {
  try {
    const campaigns = await Campaign.find({})
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Could not fetch campaigns.' });
  }
});

// --- GET CAMPAIGN BY ID (details + submissions + proofs) ---
router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName');

    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    const submissions = await ClipSubmission.find({ campaign: campaign._id })
      .populate('clipper', 'email firstName lastName');
    res.json({ campaign, submissions });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch campaign.' });
  }
});

// --- UPDATE CAMPAIGN (PATCH) ---
router.patch('/:id', requireAdminAuth, async (req, res) => {
  try {
    const allowed = [
      'title', 'rate_per_1000', 'clipper_cpm', 'budget_total',
      'budget_remaining', 'views_purchased', 'views_left', 'platforms', 'status',
      'assignedWorker', 'adWorkerPercentage', 'adWorkerStatus', 'categories', 'countries', 'hashtags', 'directions', 'cta_url', 'numClipsSuggested'
    ];
    const update = {};
    for (let key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const updated = await Campaign.findByIdAndUpdate(
      req.params.id, update, { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not update campaign.' });
  }
});

// --- DELETE CAMPAIGN (and cascade delete related submissions & proofs, release escrow) ---
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    // 1. Release escrow for this campaign (budget_remaining)
    if (campaign.budget_remaining > 0) {
      const wallet = await Wallet.findOne({ user: campaign.advertiser });
      if (wallet) {
        try {
          await wallet.releaseEscrow(campaign.budget_remaining);
        } catch (err) {
          // If there's insufficient escrow, log but don't block campaign deletion
          console.warn('Error releasing escrow:', err.message);
        }
      }
    }

    // 2. Find all submissions
    const submissions = await ClipSubmission.find({ campaign: campaign._id });

    // 3. Remove related media (images/videos)
    for (const sub of submissions) {
      for (const proof of sub.proofs || []) {
        // You need to adjust file paths if stored locally
        if (proof.proofVideo) {
          try { await fs.unlink(path.resolve('uploads', proof.proofVideo)); } catch {}
        }
        if (proof.proofImage) {
          try { await fs.unlink(path.resolve('uploads', proof.proofImage)); } catch {}
        }
      }
    }

    // 4. Delete all related submissions
    await ClipSubmission.deleteMany({ campaign: campaign._id });

    // 5. Delete campaign
    await Campaign.deleteOne({ _id: campaign._id });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ error: 'Could not delete campaign.' });
  }
});

// --- CREATE NEW CAMPAIGN (POST) ---
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    // Accept all required fields!
    const c = new Campaign({ ...req.body });
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ error: 'Could not create campaign.' });
  }
});

export default router;
