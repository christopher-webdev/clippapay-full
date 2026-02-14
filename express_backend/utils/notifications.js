import Notification from '../models/Notification.js';

/**
 * Send notification helper
 */
export const sendNotification = async ({
  user,
  title,
  message,
  type = 'system',
  priority = 'normal',
  metadata = {}
}) => {
  try {
    await Notification.create({
      user,
      title,
      message,
      type,
      priority,
      metadata,
      read: false
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

/**
 * Notification Templates
 */
export const NotificationTemplates = {
  newApplication: ({ clipperName, campaignTitle, campaignId, applicationId }) => ({
    title: 'New Application',
    message: `${clipperName} applied for your campaign "${campaignTitle}"`,
    type: 'application',
    metadata: { campaignId, applicationId }
  }),

  offerReceived: ({ campaignTitle, campaignId, applicationId, amount }) => ({
    title: 'New Offer Received',
    message: `You received an offer for "${campaignTitle}" — ₦${amount}`,
    type: 'offer',
    metadata: { campaignId, applicationId, amount }
  }),

  paymentReceived: ({ campaignTitle, campaignId, applicationId, transactionId, amount }) => ({
    title: 'Payment Received',
    message: `Payment of ₦${amount} received for "${campaignTitle}"`,
    type: 'payment',
    metadata: { campaignId, applicationId, transactionId, amount }
  }),

  systemAlert: ({ title, message, priority = 'normal', metadata = {} }) => ({
    title,
    message,
    type: 'system',
    priority,
    metadata
  })
};
