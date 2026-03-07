// routes/disputes.js
import express from 'express';
import Application from '../models/Application.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Allowed dispute statuses (you can expand)
const DISPUTE_STATUSES = {
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  RESOLVED_ADVERTISER: 'resolved_advertiser',   // advertiser wins → gets refund
  RESOLVED_CLIPPER: 'resolved_clipper',         // clipper wins → gets paid
  RESOLVED_SPLIT: 'resolved_split',             // partial refund / partial pay
  CANCELLED: 'cancelled'
};

// ────────────────────────────────────────────────
//      CLIPPER or ADVERTISER raises dispute
//      (usually after 3 revisions or missed deadline)
// ────────────────────────────────────────────────
router.post(
  '/application/:applicationId/raise',
  requireAuth,
  async (req, res) => {
    try {
      const { reason, evidenceLinks } = req.body; // evidenceLinks = array of URLs or file paths

      const application = await Application.findById(req.params.applicationId)
        .populate('campaign clipper');

      if (!application) return res.status(404).json({ error: 'Application not found' });

      const isAdvertiser = application.campaign.advertiser.toString() === req.user._id.toString();
      const isClipper = application.clipper._id.toString() === req.user._id.toString();

      if (!isAdvertiser && !isClipper) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (application.disputeRaised) {
        return res.status(400).json({ error: 'Dispute already raised' });
      }

      if (application.revisionCount < 3 && application.status !== 'expired') {
        return res.status(403).json({ error: 'Dispute only allowed after 3 revisions or deadline miss' });
      }

      application.disputeRaised = true;
      application.disputeRaisedBy = req.user._id;
      application.disputeReason = reason?.trim();
      application.disputeEvidence = evidenceLinks || [];
      application.status = 'disputed'; // Add 'disputed' to Application status enum

      await application.save();

      // Notify the other party
      const otherParty = isAdvertiser ? application.clipper._id : application.campaign.advertiser._id;

      await new Notification({
        user: otherParty,
        type: 'dispute_raised',
        title: 'Dispute Raised',
        message: `A dispute has been raised on "${application.campaign.title}". Admin will review.`,
        data: { applicationId: application._id, raisedBy: req.user._id.toString() },
        priority: 'urgent'
      }).save();

      // Notify admin(s) – you can target admin users or a specific admin role
      // For simplicity, assuming you have admin users with role 'admin'
      // Or send to a Slack/Discord webhook, etc.

      res.json({ success: true, message: 'Dispute raised successfully. Admin will review.' });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to raise dispute' });
    }
  }
);

// ────────────────────────────────────────────────
//      ADMIN VIEWS ALL OPEN DISPUTES
// ────────────────────────────────────────────────
router.get('/admin/open', requireAdminAuth, async (req, res) => {
  try {
    const disputes = await Application.find({
      disputeRaised: true,
      status: 'disputed'
    })
      .populate('campaign advertiser clipper', 'title firstName lastName email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, disputes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load disputes' });
  }
});

// ────────────────────────────────────────────────
//      ADMIN RESOLVES DISPUTE
// ────────────────────────────────────────────────
router.post(
  '/admin/:applicationId/resolve',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { resolution, amountRefunded, notes } = req.body;
      // resolution: 'advertiser', 'clipper', 'split', 'cancel'

      if (!Object.values(DISPUTE_STATUSES).includes(resolution)) {
        return res.status(400).json({ error: 'Invalid resolution type' });
      }

      const application = await Application.findById(req.params.applicationId)
        .populate('campaign clipper');

      if (!application || !application.disputeRaised) {
        return res.status(404).json({ error: 'No active dispute found' });
      }

      const advertiserWallet = await Wallet.findOne({ user: application.campaign.advertiser });
      const clipperWallet = await Wallet.findOne({ user: application.clipper._id });

      let finalStatus = 'disputed_resolved';
      let messageAdvertiser = '';
      let messageClipper = '';

      if (resolution === DISPUTE_STATUSES.RESOLVED_ADVERTISER) {
        // Full refund to advertiser
        if (application.paymentCurrency === 'NGN') {
          await advertiserWallet.releaseEscrowNGN(application.paymentAmount);
        } else {
          await advertiserWallet.releaseEscrowUSDT(application.paymentAmount);
        }
        messageAdvertiser = `Dispute resolved in your favor. Full amount (${application.paymentAmount} ${application.paymentCurrency}) returned.`;
        messageClipper = `Dispute resolved against you. No payment released.`;

      } else if (resolution === DISPUTE_STATUSES.RESOLVED_CLIPPER) {
        // Full payment to clipper
        if (application.paymentCurrency === 'NGN') {
          await advertiserWallet.releaseEscrowNGN(application.paymentAmount);
          await clipperWallet.creditNGN(application.paymentAmount);
        } else {
          await advertiserWallet.releaseEscrowUSDT(application.paymentAmount);
          await clipperWallet.creditUSDT(application.paymentAmount);
        }
        messageAdvertiser = `Dispute resolved in favor of clipper. Full amount paid out.`;
        messageClipper = `Dispute resolved in your favor. ${application.paymentAmount} ${application.paymentCurrency} credited.`;

      } else if (resolution === DISPUTE_STATUSES.RESOLVED_SPLIT && amountRefunded) {
        // Partial refund
        const refundAmount = Number(amountRefunded);
        if (refundAmount <= 0 || refundAmount > application.paymentAmount) {
          return res.status(400).json({ error: 'Invalid refund amount' });
        }

        const payClipper = application.paymentAmount - refundAmount;

        if (application.paymentCurrency === 'NGN') {
          await advertiserWallet.releaseEscrowNGN(application.paymentAmount);
          await advertiserWallet.debitNGN(payClipper); // simulate taking platform cut or direct
          await clipperWallet.creditNGN(payClipper);
        } else {
          // similar for USDT
        }

        messageAdvertiser = `Dispute resolved with split. ₦${refundAmount} refunded, ₦${payClipper} paid to clipper.`;
        messageClipper = `Dispute resolved with split. You received ${payClipper} ${application.paymentCurrency}.`;
      }

      application.status = finalStatus;
      application.disputeResolution = resolution;
      application.disputeResolvedAt = new Date();
      application.disputeResolvedBy = req.user._id;
      application.disputeAdminNotes = notes;

      await application.save();

      // Notifications
      await new Notification({
        user: application.campaign.advertiser,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: messageAdvertiser,
        priority: 'high',
        data: { applicationId: application._id, resolution }
      }).save();

      await new Notification({
        user: application.clipper._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: messageClipper,
        priority: 'high',
        data: { applicationId: application._id, resolution }
      }).save();

      res.json({ success: true, resolution, application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to resolve dispute' });
    }
  }
);

export default router;