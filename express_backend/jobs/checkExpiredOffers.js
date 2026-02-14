// jobs/checkExpiredOffers.js
import Application from '../models/Application.js';
import { sendNotification } from '../utils/notifications.js';

export async function checkExpiredOffers() {
  try {
    const now = new Date();
    
    // Find expired offers
    const expiredOffers = await Application.find({
      status: 'offer_sent',
      offerExpiresAt: { $lt: now }
    }).populate('campaign').populate('clipper').populate('advertiser');

    for (const app of expiredOffers) {
      app.status = 'expired';
      await app.save();

      // Notify advertiser
      await sendNotification({
        user: app.advertiser,
        type: 'offer_expired',
        title: 'Offer Expired',
        message: `${app.clipper.firstName || 'Clipper'} did not respond within 2 hours`,
        data: { campaignId: app.campaign._id, applicationId: app._id }
      });

      // Notify clipper
      await sendNotification({
        user: app.clipper,
        type: 'offer_expired',
        title: 'Offer Expired',
        message: `Your offer for "${app.campaign.title}" has expired`,
        data: { campaignId: app.campaign._id, applicationId: app._id }
      });
    }

    console.log(`Processed ${expiredOffers.length} expired offers`);
  } catch (err) {
    console.error('Error checking expired offers:', err);
  }
}