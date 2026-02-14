// In your application routes
import { sendNotification, NotificationTemplates } from '../utils/notifications.js';

// When clipper applies
await sendNotification({
  user: campaign.advertiser,
  ...NotificationTemplates.newApplication({
    clipperName: `${req.user.firstName} ${req.user.lastName}`,
    campaignTitle: campaign.title,
    campaignId: campaign._id,
    applicationId: application._id
  })
});

// When advertiser sends offer
await sendNotification({
  user: clipperId,
  ...NotificationTemplates.offerReceived({
    campaignTitle: campaign.title,
    campaignId: campaign._id,
    applicationId: application._id,
    amount: campaign.clipper_cpm
  })
});

// When payment is made
await sendNotification({
  user: clipperId,
  ...NotificationTemplates.paymentReceived({
    campaignTitle: campaign.title,
    campaignId: campaign._id,
    applicationId: application._id,
    transactionId: transaction._id,
    amount: payoutAmount
  })
});

// System alert example
await sendNotification({
  user: userId,
  ...NotificationTemplates.systemAlert({
    title: 'Maintenance Notice',
    message: 'Scheduled maintenance in 1 hour. Platform may be unavailable for 30 minutes.',
    priority: 'urgent',
    metadata: { duration: '30 minutes', startTime: '02:00 UTC' }
  })
});