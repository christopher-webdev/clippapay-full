// routes/applicationsScript.js
import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const Application = mongoose.model('Application');
const Campaign = mongoose.model('Campaign');
const Notification = mongoose.model('Notification');


// ─────────────────────────────────────────────
// CLIPPER → SUBMIT SCRIPT
// POST /api/applications/:id/script
// ─────────────────────────────────────────────
router.post('/:id/script', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Script content required' });
    }

    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.clipper) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await app.submitScript(content);

    // Notify advertiser
    await Notification.create({
      user: app.advertiser,
      type: 'submission_received',
      title: 'Script Ready for Review',
      message: `A script has been submitted for ${app.campaign.title}`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// ADVERTISER → APPROVE SCRIPT
// POST /api/applications/:id/approve-script
// ─────────────────────────────────────────────
router.post('/:id/approve-script', requireAuth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.advertiser) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await app.approveScript();

    // Notify clipper
    await Notification.create({
      user: app.clipper,
      type: 'offer_accepted',
      title: 'Script Approved 🎬',
      message: `Your script has been approved. Start filming!`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────
// ADVERTISER → REQUEST SCRIPT CHANGES
// POST /api/applications/:id/request-script-changes
// ─────────────────────────────────────────────
router.post('/:id/request-script-changes', requireAuth, async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback?.trim()) {
      return res.status(400).json({ error: 'Feedback required' });
    }

    const app = await Application.findById(req.params.id)
      .populate('campaign');

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (String(app.advertiser) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await app.requestScriptChanges(feedback);

    // Notify clipper
    await Notification.create({
      user: app.clipper,
      type: 'revision_requested',
      title: 'Script Changes Requested',
      message: `Changes were requested for your script.`,
      data: { applicationId: app._id }
    });

    res.json({ success: true, application: app });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
