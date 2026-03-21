// routes/disputes.js
// Admin dispute management endpoints
// All actions are admin-only (requireAdminAuth middleware)
//
// GET  /api/disputes              — list all disputed applications (paginated, filterable)
// GET  /api/disputes/:id          — single dispute with full populated data
// POST /api/disputes/:id/pay-clipper    — release escrow to clipper, mark resolved
// POST /api/disputes/:id/refund-advertiser — return escrow to advertiser, mark resolved
// POST /api/disputes/:id/reassign — expire current application so advertiser can pick new creator
// POST /api/disputes/:id/note     — admin adds an internal note / resolution message
//
import express from 'express';
import Application from '../models/Application.js';
import Campaign from '../models/Campaign.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// ─── GET /api/disputes ───────────────────────────────────────────────────────
// Returns all applications with disputeRaised:true, newest first
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const { status = '', page = 1, limit = 20, search = '' } = req.query;

    // Base filter — all disputed apps
    const filter = { disputeRaised: true };

    // Optionally narrow by resolution status
    if (status === 'open')     filter.status = 'disputed';
    if (status === 'resolved') filter.status = 'disputed_resolved';

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate({
          path: 'campaign',
          select: 'title category description thumbnailUrl advertiser',
          populate: { path: 'advertiser', select: 'firstName lastName email phone company profileImage' },
        })
        .populate('clipper', 'firstName lastName email phone profileImage rating')
        .sort({ updatedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.json({
      disputes: applications,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('Disputes list error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ─── GET /api/disputes/:id ───────────────────────────────────────────────────
router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: 'campaign',
        select: 'title category description script thumbnailUrl advertiser createdAt',
        populate: { path: 'advertiser', select: 'firstName lastName email phone company profileImage country' },
      })
      .populate('clipper', 'firstName lastName email phone profileImage rating country categories bio')
      .lean();

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Fetch wallet snapshots for context
    const [advWallet, clipperWallet] = await Promise.all([
      Wallet.findOne({ user: application.campaign?.advertiser?._id }).select('balance escrowLocked usdtBalance usdtEscrowLocked').lean(),
      Wallet.findOne({ user: application.clipper?._id }).select('balance usdtBalance').lean(),
    ]);

    res.json({ dispute: application, advWallet, clipperWallet });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// ─── POST /api/disputes/:id/pay-clipper ──────────────────────────────────────
// Admin rules in favour of the clipper:
//   escrow → clipper wallet, campaign → completed, application → disputed_resolved
router.post('/:id/pay-clipper', requireAdminAuth, async (req, res) => {
  try {
    const { note = '' } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('campaign clipper');

    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.status === 'disputed_resolved') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }
    if (!application.paymentAmount) {
      return res.status(400).json({ error: 'No payment amount set on this application' });
    }

    const amount   = application.paymentAmount;
    const currency = application.paymentCurrency;
    const isNGN    = currency === 'NGN';

    // Get wallets
    const [advWallet, clipperWallet] = await Promise.all([
      Wallet.findOne({ user: application.campaign.advertiser }),
      Wallet.findOne({ user: application.clipper._id }),
    ]);

    if (!advWallet)    return res.status(404).json({ error: 'Advertiser wallet not found' });
    if (!clipperWallet) return res.status(404).json({ error: 'Clipper wallet not found' });

    // Release escrow → clipper
    if (isNGN) {
      const deduct = Math.min(amount, advWallet.escrowLocked || 0);
      advWallet.escrowLocked = (advWallet.escrowLocked || 0) - deduct;
      await advWallet.save();
      await clipperWallet.creditNGN(amount);
    } else {
      const deduct = Math.min(amount, advWallet.usdtEscrowLocked || 0);
      advWallet.usdtEscrowLocked = (advWallet.usdtEscrowLocked || 0) - deduct;
      await advWallet.save();
      await clipperWallet.creditUSDT(amount);
    }

    // Transaction records
    await Transaction.create({
      user: application.clipper._id,
      type: 'payment',
      amount, currency, status: 'completed',
      reference: `dispute-pay:${application._id}`,
      description: `Dispute resolved — payment released by admin for "${application.campaign.title}"`,
    });
    await Transaction.create({
      user: application.campaign.advertiser,
      type: 'payment',
      amount, currency, status: 'completed',
      reference: `dispute-escrow-release:${application._id}`,
      description: `Dispute resolved — escrow released by admin for "${application.campaign.title}"`,
    });

    // Update application
    application.status         = 'disputed_resolved';
    application.escrowReleased = true;
    application.completedAt    = new Date();
    await application.save();

    // Mark campaign completed
    try {
      const campaign = await Campaign.findById(application.campaign._id);
      if (campaign && !['completed','cancelled'].includes(campaign.status)) {
        campaign.status = 'completed';
        campaign.completedAt = new Date();
        campaign.paymentReleased = true;
        await campaign.save();
      }
    } catch (_) {}

    // Notify both parties
    const sym = isNGN ? '₦' : '$';
    const resolutionNote = note.trim() || 'The dispute has been reviewed and resolved by our team.';

    await Notification.create({
      user: application.clipper._id,
      type: 'dispute_resolved',
      title: '✅ Dispute Resolved — Payment Released',
      message: `Your dispute for "${application.campaign.title}" has been resolved in your favour. ${sym}${amount.toLocaleString()} ${currency} has been credited to your wallet. ${resolutionNote}`,
      priority: 'high',
    });
    await Notification.create({
      user: application.campaign.advertiser,
      type: 'dispute_resolved',
      title: '⚖️ Dispute Resolved',
      message: `The dispute for "${application.campaign.title}" has been reviewed. Admin ruled in the creator's favour. Payment of ${sym}${amount.toLocaleString()} ${currency} has been released. ${resolutionNote}`,
      priority: 'high',
    });

    res.json({
      success: true,
      message: `Payment of ${sym}${amount.toLocaleString()} ${currency} released to creator. Dispute resolved.`,
    });
  } catch (err) {
    console.error('pay-clipper error:', err);
    res.status(500).json({ error: err.message || 'Failed to pay clipper' });
  }
});

// ─── POST /api/disputes/:id/refund-advertiser ────────────────────────────────
// Admin rules in favour of the advertiser:
//   escrow → advertiser wallet, application → disputed_resolved
router.post('/:id/refund-advertiser', requireAdminAuth, async (req, res) => {
  try {
    const { note = '' } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('campaign clipper');

    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.status === 'disputed_resolved') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }

    const amount   = application.paymentAmount;
    const currency = application.paymentCurrency;
    const isNGN    = currency === 'NGN';

    const advWallet = await Wallet.findOne({ user: application.campaign.advertiser });
    if (!advWallet) return res.status(404).json({ error: 'Advertiser wallet not found' });

    // Return escrow to advertiser
    if (isNGN) {
      const deduct = Math.min(amount, advWallet.escrowLocked || 0);
      advWallet.escrowLocked = (advWallet.escrowLocked || 0) - deduct;
      advWallet.balance      = (advWallet.balance || 0) + deduct;
    } else {
      const deduct = Math.min(amount, advWallet.usdtEscrowLocked || 0);
      advWallet.usdtEscrowLocked = (advWallet.usdtEscrowLocked || 0) - deduct;
      advWallet.usdtBalance      = (advWallet.usdtBalance || 0) + deduct;
    }
    await advWallet.save();

    if (amount) {
      await Transaction.create({
        user: application.campaign.advertiser,
        type: 'refund',
        amount, currency, status: 'completed',
        reference: `dispute-refund:${application._id}`,
        description: `Dispute resolved — escrow refunded by admin for "${application.campaign.title}"`,
      });
    }

    // Update application
    application.status      = 'disputed_resolved';
    application.completedAt = new Date();
    await application.save();

    // Mark campaign cancelled (no creator delivered acceptable work)
    try {
      const campaign = await Campaign.findById(application.campaign._id);
      if (campaign && !['completed','cancelled'].includes(campaign.status)) {
        campaign.status = 'cancelled';
        campaign.cancelledAt = new Date();
        campaign.cancelledReason = 'Dispute resolved — refunded to advertiser';
        await campaign.save();
      }
    } catch (_) {}

    const sym = isNGN ? '₦' : '$';
    const resolutionNote = note.trim() || 'The dispute has been reviewed and resolved by our team.';

    await Notification.create({
      user: application.campaign.advertiser,
      type: 'dispute_resolved',
      title: '✅ Dispute Resolved — Refund Issued',
      message: `Your dispute for "${application.campaign.title}" has been resolved in your favour. ${amount ? `${sym}${amount.toLocaleString()} ${currency} has been returned to your wallet.` : ''} ${resolutionNote}`,
      priority: 'high',
    });
    await Notification.create({
      user: application.clipper._id,
      type: 'dispute_resolved',
      title: '⚖️ Dispute Resolved',
      message: `The dispute for "${application.campaign.title}" has been reviewed. Admin ruled in the advertiser's favour. No payment will be made for this job. ${resolutionNote}`,
      priority: 'high',
    });

    res.json({
      success: true,
      message: `Escrow refunded to advertiser. Dispute resolved.`,
    });
  } catch (err) {
    console.error('refund-advertiser error:', err);
    res.status(500).json({ error: err.message || 'Failed to refund advertiser' });
  }
});

// ─── POST /api/disputes/:id/reassign ─────────────────────────────────────────
// Admin allows advertiser to pick a new creator:
//   - current application → expired (dismissed)
//   - escrow stays locked (will be used for new selection)
//   - campaign → active so new applicants can be selected
//   - both parties notified
router.post('/:id/reassign', requireAdminAuth, async (req, res) => {
  try {
    const { note = '' } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('campaign clipper');

    if (!application) return res.status(404).json({ error: 'Not found' });
    if (application.status === 'disputed_resolved') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }

    // Expire the current application
    application.status      = 'disputed_resolved';
    application.completedAt = new Date();
    await application.save();

    // Re-open campaign so advertiser can select new applicant
    try {
      const campaign = await Campaign.findById(application.campaign._id);
      if (campaign) {
        campaign.status          = 'active';
        campaign.selectedClipper = undefined;
        campaign.currentSubmission = undefined;
        await campaign.save();
      }
    } catch (_) {}

    const resolutionNote = note.trim() || 'The dispute has been reviewed by our team.';

    await Notification.create({
      user: application.campaign.advertiser,
      type: 'dispute_resolved',
      title: '🔄 Dispute Resolved — Select a New Creator',
      message: `Your dispute for "${application.campaign.title}" has been reviewed. You can now select a new creator from your existing applicants. ${resolutionNote}`,
      priority: 'high',
    });
    await Notification.create({
      user: application.clipper._id,
      type: 'dispute_resolved',
      title: '⚖️ Dispute Resolved',
      message: `The dispute for "${application.campaign.title}" has been reviewed. The advertiser has been allowed to select a new creator. ${resolutionNote}`,
      priority: 'high',
    });

    res.json({ success: true, message: 'Current creator dismissed. Advertiser can now select a new creator.' });
  } catch (err) {
    console.error('reassign error:', err);
    res.status(500).json({ error: err.message || 'Failed to reassign' });
  }
});

// ─── POST /api/disputes/:id/note ─────────────────────────────────────────────
// Admin adds an internal note without resolving — useful for logging contact attempts
router.post('/:id/note', requireAdminAuth, async (req, res) => {
  try {
    const { note, notifyBoth = false } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'Note is required' });

    const application = await Application.findById(req.params.id).populate('campaign clipper');
    if (!application) return res.status(404).json({ error: 'Not found' });

    // If notifyBoth, send update to both parties
    if (notifyBoth) {
      await Notification.create({
        user: application.campaign.advertiser,
        type: 'system_alert',
        title: '📋 Dispute Update',
        message: `Update on your dispute for "${application.campaign.title}": ${note.trim()}`,
        priority: 'medium',
      });
      await Notification.create({
        user: application.clipper._id,
        type: 'system_alert',
        title: '📋 Dispute Update',
        message: `Update on your dispute for "${application.campaign.title}": ${note.trim()}`,
        priority: 'medium',
      });
    }

    res.json({ success: true, message: notifyBoth ? 'Note saved and both parties notified.' : 'Note saved.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save note' });
  }
});

export default router;
