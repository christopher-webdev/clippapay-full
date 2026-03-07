// File: express_backend/utils/notificationHelpers.js

import { pushNotificationService } from '../services/pushNotificationService.js';

export async function sendWalletNotification(userId, type, data) {
  const notifications = {
    deposit_submitted: {
      title: 'Deposit Request Submitted',
      body: `Your deposit of ${data.amountFormatted} has been submitted and is pending approval.`,
      channelId: 'deposits',
    },
    deposit_approved: {
      title: 'Deposit Approved',
      body: `Your deposit of ${data.amountFormatted} has been approved and credited to your wallet.`,
      channelId: 'deposits',
    },
    deposit_rejected: {
      title: 'Deposit Rejected',
      body: `Your deposit of ${data.amountFormatted} has been rejected. ${data.reason || ''}`,
      channelId: 'deposits',
    },
    withdrawal_submitted: {
      title: 'Withdrawal Request Submitted',
      body: `Your withdrawal request of ${data.amountFormatted} has been submitted and is pending processing.`,
      channelId: 'withdrawals',
    },
    withdrawal_completed: {
      title: 'Withdrawal Completed',
      body: `Your withdrawal of ${data.amountFormatted} has been processed successfully.`,
      channelId: 'withdrawals',
    },
    withdrawal_declined: {
      title: 'Withdrawal Declined',
      body: `Your withdrawal request of ${data.amountFormatted} has been declined. ${data.reason || ''}`,
      channelId: 'withdrawals',
    },
    wallet_credited: {
      title: 'Wallet Credited',
      body: `Your wallet has been credited with ${data.amountFormatted}.`,
      channelId: 'wallet',
    },
    low_balance: {
      title: 'Low Balance Alert',
      body: `Your wallet balance is below the recommended threshold. Please consider funding your account.`,
      channelId: 'wallet',
    },
  };

  const notification = notifications[type];
  if (!notification) {
    console.error(`Unknown notification type: ${type}`);
    return;
  }

  try {
    await pushNotificationService.sendToUser(userId, {
      title: notification.title,
      body: notification.body,
      data: {
        type,
        ...data,
      },
      channelId: notification.channelId,
      badge: data.badge || 1,
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}