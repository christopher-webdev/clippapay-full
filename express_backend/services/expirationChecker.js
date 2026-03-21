// services/expirationChecker.js
// MERGED: keeps everything from the old version AND adds the new auto-complete logic.
// Three jobs run every 5 minutes:
//   1. Offer expiry     — clipper didn't accept within 2h → expired + refund advertiser
//   2. Overdue delivery — clipper accepted but missed 48h deadline → expired + refund advertiser
//   3. Auto-complete    — advertiser didn't review submitted video within 72h → auto-pay clipper (NEW)
//
import cron from 'node-cron';
import Application from '../models/Application.js';
import Campaign from '../models/Campaign.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { releaseEscrowToClipper } from '../routes/campaigns.js';

// Push notifications are optional — only used if the service exists
let pushNotificationService = null;
try {
  const mod = await import('./pushNotificationService.js');
  pushNotificationService = mod.pushNotificationService;
} catch (_) { /* not configured — skip silently */ }

const safePush = async (userId, payload) => {
  if (!pushNotificationService || !userId) return;
  try { await pushNotificationService.sendToUser(userId, payload); } catch (_) {}
};

// Helper: release escrow back to advertiser (with model method + manual fallback)
const refundEscrow = async (app) => {
  if (!app.paymentAmount || !app.campaign) return;
  const wallet = await Wallet.findOne({ user: app.campaign.advertiser });
  if (!wallet) return;
  try {
    if (app.paymentCurrency === 'NGN') await wallet.releaseEscrowNGN(app.paymentAmount);
    else await wallet.releaseEscrowUSDT(app.paymentAmount);
  } catch (_) {
    // Fallback if model method throws (e.g. slight rounding mismatch)
    if (app.paymentCurrency === 'NGN') {
      wallet.escrowLocked = Math.max(0, (wallet.escrowLocked || 0) - app.paymentAmount);
      wallet.balance      = (wallet.balance || 0) + app.paymentAmount;
    } else {
      wallet.usdtEscrowLocked = Math.max(0, (wallet.usdtEscrowLocked || 0) - app.paymentAmount);
      wallet.usdtBalance      = (wallet.usdtBalance || 0) + app.paymentAmount;
    }
    await wallet.save();
  }
};

export function startExpirationChecker() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Expiration Checker] Running...');
    try {
      await checkExpiredOffers();
      await checkOverdueDeliveries();
      await checkAutoComplete();
    } catch (err) {
      console.error('[Expiration Checker] Critical error:', err);
    }
  });
  console.log('[Expiration Checker] Started – checking every 5 minutes');
}

// ─── 1. Offer expiry ──────────────────────────────────────────────────────────
// Clipper was selected but didn't accept within 2 hours.
async function checkExpiredOffers() {
  const expiredOffers = await Application.find({
    status: 'selected',
    offerExpiresAt: { $lt: new Date() },
  }).populate('campaign');

  for (const app of expiredOffers) {
    try {
      app.status = 'expired';
      await app.save();

      await refundEscrow(app);

      // Notify clipper
      await new Notification({
        user: app.clipper,
        type: 'offer_expired',
        title: '⏰ Offer Expired',
        message: `Your 2-hour window to accept the offer for "${app.campaign?.title}" has expired.`,
        data: { campaignId: app.campaign?._id, applicationId: app._id },
        priority: 'medium',
      }).save();

      // Notify advertiser
      if (app.campaign) {
        await new Notification({
          user: app.campaign.advertiser,
          type: 'offer_expired',
          title: '⏰ Offer Not Accepted',
          message: `The selected creator did not accept your offer in time for "${app.campaign.title}". You can now select another applicant.`,
          data: { campaignId: app.campaign._id },
          priority: 'medium',
        }).save();
      }

      await safePush(app.clipper, { title: 'Offer Expired', body: `Time ran out for ${app.campaign?.title}`, data: { campaignId: app.campaign?._id?.toString() } });
      if (app.campaign) await safePush(app.campaign.advertiser, { title: 'Creator Did Not Accept', body: 'You can choose another creator now', data: { campaignId: app.campaign._id.toString() } });

      console.log(`[ExpirationChecker] Expired offer: app ${app._id}`);
    } catch (err) {
      console.error(`[ExpirationChecker] Error processing expired offer ${app._id}:`, err.message);
    }
  }
}

// ─── 2. Overdue delivery ──────────────────────────────────────────────────────
// Clipper accepted the job but missed the 48h delivery deadline.
// Policy: auto-fail, refund advertiser's escrow.
async function checkOverdueDeliveries() {
  const overdue = await Application.find({
    status: { $in: ['accepted', 'revision_requested'] },
    submissionDeadline: { $lt: new Date() },
  }).populate('campaign');

  for (const app of overdue) {
    try {
      app.status = 'expired';
      await app.save();

      await refundEscrow(app);

      // Log refund transaction
      if (app.paymentAmount && app.campaign) {
        try {
          await Transaction.create({
            user: app.campaign.advertiser,
            type: 'refund',
            amount: app.paymentAmount,
            currency: app.paymentCurrency,
            status: 'completed',
            reference: `overdue-refund:${app._id}`,
            description: `Delivery deadline missed — "${app.campaign.title}" escrow refunded`,
          });
        } catch (_) {}
      }

      // Notify clipper
      await new Notification({
        user: app.clipper,
        type: 'system_alert',
        title: '❌ Delivery Deadline Missed',
        message: `You missed the delivery deadline for "${app.campaign?.title}". The job has been cancelled and funds returned to the advertiser.`,
        priority: 'high',
      }).save();

      // Notify advertiser
      if (app.campaign) {
        await new Notification({
          user: app.campaign.advertiser,
          type: 'system_alert',
          title: '📦 Delivery Overdue — Funds Returned',
          message: `The creator missed the delivery deadline for "${app.campaign.title}". Your escrow has been returned to your wallet.`,
          priority: 'high',
        }).save();
      }

      await safePush(app.clipper, { title: 'Deadline Missed', body: `Job cancelled for ${app.campaign?.title}` });
      if (app.campaign) await safePush(app.campaign.advertiser, { title: 'Delivery Overdue', body: 'Funds returned to your wallet' });

      console.log(`[ExpirationChecker] Overdue delivery processed: app ${app._id}`);
    } catch (err) {
      console.error(`[ExpirationChecker] Error processing overdue delivery ${app._id}:`, err.message);
    }
  }
}

// ─── 3. Auto-complete (NEW) ───────────────────────────────────────────────────
// Creator delivered the video but advertiser didn't review within 72 hours.
// Pay the creator automatically — they did the work.
async function checkAutoComplete() {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h ago

  const campaigns = await Campaign.find({
    status: { $in: ['video_submitted', 'revision_submitted'] },
    paymentReleased: { $ne: true },
    updatedAt: { $lt: cutoff },
  });

  for (const campaign of campaigns) {
    try {
      if (campaign.paymentReleased) continue;

      const app = await Application.findOne({
        campaign: campaign._id,
        status: { $in: ['submitted', 'revision_requested'] },
      }).populate('clipper campaign');

      if (!app || !app.paymentAmount) continue;

      console.log(`[ExpirationChecker] Auto-completing campaign ${campaign._id} (${campaign.title})`);

      await releaseEscrowToClipper(campaign, app);
      await app.save();
      await campaign.markCompleted();
      await campaign.save();

      // Notify advertiser
      await Notification.create({
        user: campaign.advertiser,
        type: 'campaign_auto_completed',
        title: '✅ Campaign Auto-Completed',
        message: `Your UGC campaign "${campaign.title}" was auto-completed after 72 hours without a review. Payment has been released to the creator.`,
        priority: 'medium',
      });

      // Notify creator
      const creatorId = app.clipper?._id || app.clipper;
      if (creatorId) {
        await Notification.create({
          user: creatorId,
          type: 'payment_received',
          title: '💰 Payment Released!',
          message: `Your video for "${campaign.title}" was auto-approved after 72 hours. Payment credited to your wallet.`,
          priority: 'high',
        });
      }

      await safePush(campaign.advertiser, { title: 'Campaign Auto-Completed', body: `${campaign.title} auto-completed` });
      if (creatorId) await safePush(creatorId, { title: 'Payment Received', body: `Payment released for ${campaign.title}` });

      console.log(`[ExpirationChecker] Auto-completed: ${campaign._id}, paid ${app.paymentCurrency} ${app.paymentAmount}`);
    } catch (err) {
      console.error(`[ExpirationChecker] Error auto-completing ${campaign._id}:`, err.message);
    }
  }
}
