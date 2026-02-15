// jobs/checkExpiredOffers.js
import mongoose from 'mongoose';

const Application = mongoose.model('Application');
const Notification = mongoose.model('Notification');

export const checkExpiredOffers = async () => {
  try {
    const now = new Date();

    // ─────────────────────────────────────────────
    // 1️⃣ EXPIRE OFFERS (offer_sent → expired)
    // ─────────────────────────────────────────────
    const expiredOffers = await Application.find({
      status: 'offer_sent',
      offerExpiresAt: { $lte: now }
    });

    for (const app of expiredOffers) {
      app.status = 'expired';
      await app.save();

      await Notification.create({
        user: app.clipper,
        type: 'offer_expired',
        title: 'Offer Expired ⏳',
        message: 'The job offer has expired.',
        data: { applicationId: app._id }
      });

      await Notification.create({
        user: app.advertiser,
        type: 'offer_expired',
        title: 'Offer Expired',
        message: 'Your offer expired due to no response.',
        data: { applicationId: app._id }
      });
    }


    // ─────────────────────────────────────────────
    // 2️⃣ EXPIRE SCRIPT PHASE (accepted → expired)
    // ─────────────────────────────────────────────
    const expiredScripts = await Application.find({
      status: 'accepted',
      scriptStatus: { $in: ['pending_review', 'changes_requested'] },
      scriptExpiresAt: { $lte: now }
    });

    for (const app of expiredScripts) {
      app.status = 'expired';
      await app.save();

      await Notification.create({
        user: app.clipper,
        type: 'offer_expired',
        title: 'Script Deadline Missed ⏳',
        message: 'You did not submit/update script within 2 hours.',
        data: { applicationId: app._id }
      });

      await Notification.create({
        user: app.advertiser,
        type: 'offer_expired',
        title: 'Script Phase Expired',
        message: 'Creator did not submit script in time.',
        data: { applicationId: app._id }
      });
    }


    // ─────────────────────────────────────────────
    // 3️⃣ EXPIRE VIDEO DEADLINE (working/revision_requested)
    // ─────────────────────────────────────────────
    const expiredSubmissions = await Application.find({
      status: { $in: ['working', 'revision_requested'] },
      submissionDeadline: { $lte: now }
    });

    for (const app of expiredSubmissions) {
      app.status = 'expired';
      await app.save();

      await Notification.create({
        user: app.clipper,
        type: 'offer_expired',
        title: 'Submission Deadline Missed ⏳',
        message: 'You did not submit your video before the deadline.',
        data: { applicationId: app._id }
      });

      await Notification.create({
        user: app.advertiser,
        type: 'offer_expired',
        title: 'Submission Expired',
        message: 'Creator failed to submit before deadline.',
        data: { applicationId: app._id }
      });
    }

    console.log('⏳ Expiry job completed');

  } catch (err) {
    console.error('Expiry job error:', err);
  }
};
