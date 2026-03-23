// services/pushNotificationService.js  — SERVER SIDE
// Sends push notifications via Expo's push API
// npm install expo-server-sdk

import Expo from 'expo-server-sdk';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * Send a push notification to a specific user.
 * Also creates an in-app Notification document.
 *
 * @param {string|ObjectId} userId
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} opts.type          - must match Notification.type enum
 * @param {object} [opts.data]        - extra payload for deep-link handling
 * @param {string} [opts.channelId]   - android channel ('default'|'wallet'|'deposits'|'withdrawals')
 * @param {string} [opts.priority]    - 'low'|'medium'|'high'|'urgent'
 * @param {number} [opts.badge]       - badge number override
 * @param {boolean} [opts.saveToDb]   - default true
 */
export async function sendPushToUser(userId, opts) {
  const {
    title,
    body,
    type = 'system_alert',
    data = {},
    channelId = 'default',
    priority = 'medium',
    badge,
    saveToDb = true,
  } = opts;

  // 1. Save in-app notification
  if (saveToDb) {
    try {
      await Notification.create({
        user: userId,
        type,
        title,
        message: body,
        priority,
        data,
        read: false,
      });
    } catch (err) {
      console.error('[Push] Failed to save notification to DB:', err.message);
    }
  }

  // 2. Get user's push tokens
  let user;
  try {
    user = await User.findById(userId).select('pushTokens').lean();
  } catch (err) {
    console.error('[Push] Failed to fetch user tokens:', err.message);
    return;
  }

  if (!user?.pushTokens?.length) return;

  // 3. Build messages for valid Expo push tokens
  const messages = [];
  for (const { token } of user.pushTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[Push] Invalid token skipped: ${token}`);
      continue;
    }

    // Get current unread count for badge
    let badgeCount = badge;
    if (badgeCount === undefined) {
      badgeCount = await Notification.countDocuments({ user: userId, read: false });
    }

    messages.push({
      to: token,
      title,
      body,
      data: { type, channelId, ...data },
      channelId,
      sound: 'default',
      badge: badgeCount,
      priority: priority === 'urgent' ? 'high' : priority === 'low' ? 'normal' : 'high',
      ttl: 3600,
    });
  }

  if (!messages.length) return;

  // 4. Send in chunks (Expo limit: 100 per batch)
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      // Log any errors
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          console.error(`[Push] Ticket error for ${chunk[i].to}:`, ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Remove stale token
            _removeStaleToken(userId, chunk[i].to).catch(() => {});
          }
        }
      });
    } catch (err) {
      console.error('[Push] Send chunk error:', err.message);
    }
  }
}

/**
 * Send push notification to multiple users at once.
 */
export async function sendPushToUsers(userIds, opts) {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, opts)));
}

/**
 * Remove a stale/invalid push token from the user document.
 */
async function _removeStaleToken(userId, token) {
  await User.updateOne(
    { _id: userId },
    { $pull: { pushTokens: { token } } }
  );
}

export default { sendPushToUser, sendPushToUsers };