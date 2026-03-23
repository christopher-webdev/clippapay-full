// utils/notificationHelpers.js
// Central helper used by all backend routes to create + push notifications.
// Import { notify } and call it wherever you need to alert a user.

import { sendPushToUser } from '../services/pushNotificationService.js';

/**
 * Create an in-app notification AND send a push notification.
 *
 * All params are optional except userId, type, title, message.
 *
 * @example
 *   await notify({
 *     userId: advertiser._id,
 *     type:    'new_application',
 *     title:   'New Application',
 *     message: `${clipper.name} applied to your campaign`,
 *     data:    { campaignId, applicationId },
 *     priority: 'high',
 *   });
 */
export async function notify({
  userId,
  type,
  title,
  message,
  data = {},
  priority = 'medium',
  channelId,
}) {
  if (!userId || !type || !title || !message) {
    console.error('[notify] Missing required fields', { userId, type, title, message });
    return;
  }

  // Derive channel from type if not specified
  if (!channelId) {
    if (type.includes('deposit'))    channelId = 'deposits';
    else if (type.includes('withdrawal')) channelId = 'withdrawals';
    else if (type.includes('wallet') || type.includes('payment')) channelId = 'wallet';
    else channelId = 'default';
  }

  try {
    // sendPushToUser saves to DB AND sends the push
    await sendPushToUser(userId, {
      title,
      body: message,
      type,
      data,
      channelId,
      priority,
      saveToDb: true,
    });
  } catch (err) {
    console.error('[notify] Error:', err.message);
  }
}

// ─── Pre-built notification templates ────────────────────────────────────────

export const Notify = {
  // ── Applications ──
  newApplication: (advertiserId, { clipperName, campaignTitle, campaignId, applicationId }) =>
    notify({
      userId: advertiserId,
      type:   'new_application',
      title:  'New Application',
      message: `${clipperName} applied to your campaign "${campaignTitle}"`,
      data:   { campaignId, applicationId },
      priority: 'high',
    }),

  offerReceived: (clipperId, { campaignTitle, campaignId, applicationId, amount }) =>
    notify({
      userId: clipperId,
      type:   'offer_received',
      title:  'New Offer Received 🎉',
      message: `You received an offer of ₦${amount?.toLocaleString()} for "${campaignTitle}"`,
      data:   { campaignId, applicationId, amount },
      priority: 'high',
    }),

  offerAccepted: (advertiserId, { clipperName, campaignTitle, campaignId, applicationId }) =>
    notify({
      userId: advertiserId,
      type:   'offer_accepted',
      title:  'Offer Accepted',
      message: `${clipperName} accepted your offer for "${campaignTitle}"`,
      data:   { campaignId, applicationId },
      priority: 'high',
    }),

  offerDeclined: (advertiserId, { clipperName, campaignTitle, campaignId, applicationId }) =>
    notify({
      userId: advertiserId,
      type:   'offer_declined',
      title:  'Offer Declined',
      message: `${clipperName} declined your offer for "${campaignTitle}"`,
      data:   { campaignId, applicationId },
      priority: 'medium',
    }),

  // ── Submissions ──
  submissionReceived: (advertiserId, { clipperName, campaignTitle, campaignId, applicationId }) =>
    notify({
      userId: advertiserId,
      type:   'submission_received',
      title:  'New Submission',
      message: `${clipperName} submitted content for "${campaignTitle}"`,
      data:   { campaignId, applicationId },
      priority: 'high',
    }),

  revisionRequested: (clipperId, { campaignTitle, campaignId, applicationId, reason }) =>
    notify({
      userId: clipperId,
      type:   'revision_requested',
      title:  'Revision Requested',
      message: `Revision needed for "${campaignTitle}"${reason ? `: ${reason}` : ''}`,
      data:   { campaignId, applicationId, reason },
      priority: 'high',
    }),

  // ── Payments ──
  paymentReceived: (clipperId, { campaignTitle, campaignId, applicationId, amount }) =>
    notify({
      userId: clipperId,
      type:   'payment_received',
      title:  'Payment Received 💰',
      message: `₦${amount?.toLocaleString()} paid for "${campaignTitle}"`,
      data:   { campaignId, applicationId, amount },
      priority: 'high',
      channelId: 'wallet',
    }),

  // ── Wallet ──
  depositConfirmed: (userId, { amount, currency = '₦' }) =>
    notify({
      userId,
      type:    'deposit_confirmed',
      title:   'Deposit Confirmed ✅',
      message: `Your deposit of ${currency}${amount?.toLocaleString()} has been approved`,
      data:    { amount },
      priority: 'high',
      channelId: 'deposits',
    }),

  depositRejected: (userId, { amount, reason, currency = '₦' }) =>
    notify({
      userId,
      type:    'deposit_confirmed', // reuse type (no 'deposit_rejected' in enum; use system_alert)
      title:   'Deposit Not Approved',
      message: `Your deposit of ${currency}${amount?.toLocaleString()} was rejected${reason ? `: ${reason}` : ''}`,
      data:    { amount, reason },
      priority: 'high',
      channelId: 'deposits',
    }),

  withdrawalApproved: (userId, { amount, currency = '₦' }) =>
    notify({
      userId,
      type:    'withdrawal_approved',
      title:   'Withdrawal Approved ✅',
      message: `Your withdrawal of ${currency}${amount?.toLocaleString()} is being processed`,
      data:    { amount },
      priority: 'high',
      channelId: 'withdrawals',
    }),

  withdrawalProcessed: (userId, { amount, currency = '₦' }) =>
    notify({
      userId,
      type:    'withdrawal_processed',
      title:   'Withdrawal Sent 🚀',
      message: `${currency}${amount?.toLocaleString()} has been sent to your account`,
      data:    { amount },
      priority: 'high',
      channelId: 'withdrawals',
    }),

  withdrawalRejected: (userId, { amount, reason, currency = '₦' }) =>
    notify({
      userId,
      type:    'withdrawal_rejected',
      title:   'Withdrawal Rejected',
      message: `Your withdrawal of ${currency}${amount?.toLocaleString()} was rejected${reason ? `: ${reason}` : ''}`,
      data:    { amount, reason },
      priority: 'urgent',
      channelId: 'withdrawals',
    }),

  walletCredited: (userId, { amount, currency = '₦' }) =>
    notify({
      userId,
      type:    'wallet_credited',
      title:   'Wallet Credited 💳',
      message: `${currency}${amount?.toLocaleString()} has been added to your wallet`,
      data:    { amount },
      priority: 'high',
      channelId: 'wallet',
    }),

  // ── Campaigns ──
  campaignApproved: (advertiserId, { campaignTitle, campaignId }) =>
    notify({
      userId: advertiserId,
      type:   'campaign_approved',
      title:  'Campaign Approved 🎉',
      message: `Your campaign "${campaignTitle}" is now live`,
      data:   { campaignId },
      priority: 'high',
    }),

  campaignRejected: (advertiserId, { campaignTitle, campaignId, reason }) =>
    notify({
      userId: advertiserId,
      type:   'campaign_rejected',
      title:  'Campaign Not Approved',
      message: `"${campaignTitle}" was rejected${reason ? `: ${reason}` : ''}`,
      data:   { campaignId, reason },
      priority: 'high',
    }),

  // ── Disputes ──
  disputeRaised: (userId, { campaignTitle, campaignId, applicationId }) =>
    notify({
      userId,
      type:   'dispute_raised',
      title:  'Dispute Filed',
      message: `A dispute has been raised on "${campaignTitle}"`,
      data:   { campaignId, applicationId },
      priority: 'urgent',
    }),

  disputeResolved: (userId, { campaignTitle, campaignId, outcome }) =>
    notify({
      userId,
      type:   'dispute_resolved',
      title:  'Dispute Resolved',
      message: `The dispute on "${campaignTitle}" has been resolved: ${outcome}`,
      data:   { campaignId, outcome },
      priority: 'high',
    }),

  // ── Clipping ──
  clippingJoined: (advertiserId, { clipperName, campaignTitle, campaignId }) =>
    notify({
      userId: advertiserId,
      type:   'clipping_joined',
      title:  'New Clipper Joined',
      message: `${clipperName} joined your clipping campaign "${campaignTitle}"`,
      data:   { campaignId },
      priority: 'medium',
    }),

  clippingApproved: (clipperId, { campaignTitle, campaignId }) =>
    notify({
      userId: clipperId,
      type:   'clipping_approved',
      title:  'Clip Approved ✅',
      message: `Your clip for "${campaignTitle}" was approved and will be counted`,
      data:   { campaignId },
      priority: 'high',
    }),
};

// Legacy compat export
export async function sendWalletNotification(userId, type, data) {
  const map = {
    deposit_submitted:    () => notify({ userId, type: 'deposit_confirmed', title: 'Deposit Submitted', message: `Your deposit of ${data.amountFormatted} is pending approval`, data, priority: 'medium', channelId: 'deposits' }),
    deposit_approved:     () => Notify.depositConfirmed(userId, { amount: data.amount }),
    deposit_rejected:     () => Notify.depositRejected(userId, { amount: data.amount, reason: data.reason }),
    withdrawal_submitted: () => notify({ userId, type: 'withdrawal_approved', title: 'Withdrawal Submitted', message: `Your withdrawal of ${data.amountFormatted} is pending`, data, priority: 'medium', channelId: 'withdrawals' }),
    withdrawal_completed: () => Notify.withdrawalProcessed(userId, { amount: data.amount }),
    withdrawal_declined:  () => Notify.withdrawalRejected(userId, { amount: data.amount, reason: data.reason }),
    wallet_credited:      () => Notify.walletCredited(userId, { amount: data.amount }),
  };
  const fn = map[type];
  if (fn) await fn();
  else console.warn('[sendWalletNotification] Unknown type:', type);
}