// services/expirationChecker.js
import cron from 'node-cron';
import Application from '../models/Application.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import { pushNotificationService } from './pushNotificationService.js'; // if you want push too

/**
 * Runs every 5 minutes
 * Checks:
 *   - Selected offers that expired (2-hour window)
 *   - Accepted jobs past submission deadline (48 hours)
 */
export function startExpirationChecker() {
  // Every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Expiration Checker] Running...');

    try {
      // 1. Expired offers (status = selected, offerExpiresAt passed)
      const expiredOffers = await Application.find({
        status: 'selected',
        offerExpiresAt: { $lt: new Date() }
      }).populate('campaign advertiser clipper');

      for (const app of expiredOffers) {
        try {
          app.status = 'expired';
          await app.save();

          // Release escrow back to advertiser
          const wallet = await Wallet.findOne({ user: app.campaign.advertiser });
          if (wallet) {
            if (app.paymentCurrency === 'NGN') {
              await wallet.releaseEscrowNGN(app.paymentAmount);
            } else {
              await wallet.releaseEscrowUSDT(app.paymentAmount);
            }
            await wallet.save();
          }

          // Notify clipper (expired)
          await new Notification({
            user: app.clipper._id,
            type: 'offer_expired',
            title: 'Offer Expired',
            message: `Your 2-hour window to accept the offer for "${app.campaign.title}" has expired.`,
            data: { campaignId: app.campaign._id, applicationId: app._id },
            priority: 'medium'
          }).save();

          // Notify advertiser
          await new Notification({
            user: app.campaign.advertiser._id,
            type: 'offer_expired',
            title: 'Offer Not Accepted',
            message: `The selected clipper did not accept your offer in time for "${app.campaign.title}". You can now select another applicant.`,
            data: { campaignId: app.campaign._id },
            priority: 'medium'
          }).save();

          // Optional: push notifications
          await pushNotificationService.sendToUser(app.clipper._id, {
            title: 'Offer Expired',
            body: `Time ran out for ${app.campaign.title}`,
            data: { campaignId: app.campaign._id.toString() }
          });

          await pushNotificationService.sendToUser(app.campaign.advertiser._id, {
            title: 'Clipper Did Not Accept',
            body: `You can choose another creator now`,
            data: { campaignId: app.campaign._id.toString() }
          });

        } catch (innerErr) {
          console.error(`Error processing expired offer ${app._id}:`, innerErr);
        }
      }

      // 2. Overdue submissions (status = accepted or revision_requested, submissionDeadline passed)
      const overdue = await Application.find({
        $or: [
          { status: 'accepted' },
          { status: 'revision_requested' }
        ],
        submissionDeadline: { $lt: new Date() }
      }).populate('campaign advertiser clipper');

      for (const app of overdue) {
        try {
          // You decide the policy:
          // Option A: auto-reject + release escrow to advertiser (strict)
          // Option B: move to dispute automatically
          // Option C: notify admin + pause

          // Example: auto-fail + refund advertiser
          app.status = 'expired'; // or 'failed' – add to enum if needed
          await app.save();

          // Refund escrow
          const wallet = await Wallet.findOne({ user: app.campaign.advertiser });
          if (wallet) {
            if (app.paymentCurrency === 'NGN') {
              await wallet.releaseEscrowNGN(app.paymentAmount);
            } else {
              await wallet.releaseEscrowUSDT(app.paymentAmount);
            }
          }

          // Notify everyone
          await new Notification({
            user: app.clipper._id,
            type: 'system_alert',
            title: 'Delivery Deadline Missed',
            message: `You missed the delivery deadline for "${app.campaign.title}". The job has been cancelled and funds returned.`,
            priority: 'high'
          }).save();

          await new Notification({
            user: app.campaign.advertiser._id,
            type: 'campaign_completed', // or new type 'delivery_failed'
            title: 'Delivery Overdue – Funds Returned',
            message: `The clipper missed the deadline for "${app.campaign.title}". Escrow released back to your wallet.`,
            priority: 'high'
          }).save();

        } catch (innerErr) {
          console.error(`Error processing overdue job ${app._id}:`, innerErr);
        }
      }

      if (expiredOffers.length > 0 || overdue.length > 0) {
        console.log(`[Expiration] Processed ${expiredOffers.length} expired offers + ${overdue.length} overdue deliveries`);
      }

    } catch (err) {
      console.error('[Expiration Checker] Critical error:', err);
    }
  });

  console.log('[Expiration Checker] Started – checking every 5 minutes');
}