// File: express_backend/services/pushNotificationService.js

import axios from 'axios';
import User from '../models/User.js';

const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

class PushNotificationService {
  
  /**
   * Send push notification to a specific user
   * @param {string} userId - User ID
   * @param {object} notification - Notification object
   * @param {string} notification.title - Notification title
   * @param {string} notification.body - Notification body
   * @param {object} notification.data - Additional data
   * @param {string} notification.sound - Sound (default, 'default')
   * @param {number} notification.badge - Badge count
   * @param {string} notification.channelId - Android channel ID
   */
  async sendToUser(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        console.log(`No push tokens for user ${userId}`);
        return [];
      }

      const messages = user.pushTokens.map(tokenInfo => ({
        to: tokenInfo.token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        channelId: notification.channelId || 'default',
        priority: 'high',
        _displayInForeground: true,
      }));

      // Send in batches of 100 (Expo's limit)
      const results = [];
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        const response = await axios.post(EXPO_API_URL, batch, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });
        
        // Handle responses
        const receipts = response.data;
        for (let j = 0; j < receipts.length; j++) {
          const receipt = receipts[j];
          const tokenInfo = batch[j];
          
          if (receipt.status === 'error') {
            // Remove invalid tokens
            if (receipt.details?.error === 'DeviceNotRegistered') {
              await this.removeInvalidToken(userId, tokenInfo.to);
            }
          }
        }
        
        results.push(...receipts);
      }

      return results;
    } catch (err) {
      console.error('Error sending push notification:', err);
      throw err;
    }
  }

  /**
   * Send push notification to multiple users
   * @param {string[]} userIds - Array of user IDs
   * @param {object} notification - Notification object
   */
  async sendToUsers(userIds, notification) {
    const results = [];
    for (const userId of userIds) {
      try {
        const result = await this.sendToUser(userId, notification);
        results.push({ userId, result });
      } catch (err) {
        console.error(`Failed to send to user ${userId}:`, err);
        results.push({ userId, error: err.message });
      }
    }
    return results;
  }

  /**
   * Send push notification to all users with a specific role
   * @param {string} role - User role
   * @param {object} notification - Notification object
   */
  async sendToRole(role, notification) {
    try {
      const users = await User.find({ role }).select('_id');
      return this.sendToUsers(users.map(u => u._id), notification);
    } catch (err) {
      console.error('Error sending to role:', err);
      throw err;
    }
  }

  /**
   * Remove invalid push token from user
   * @param {string} userId - User ID
   * @param {string} token - Invalid token
   */
  async removeInvalidToken(userId, token) {
    try {
      await User.updateOne(
        { _id: userId },
        { $pull: { pushTokens: { token } } }
      );
      console.log(`Removed invalid token ${token} for user ${userId}`);
    } catch (err) {
      console.error('Error removing invalid token:', err);
    }
  }

  /**
   * Clean up old/unused tokens (run as a cron job)
   * Removes tokens not used for 30 days
   */
  async cleanupOldTokens() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await User.updateMany(
        {},
        { $pull: { pushTokens: { lastUsed: { $lt: thirtyDaysAgo } } } }
      );

      console.log(`Cleaned up old push tokens: ${result.modifiedCount} users affected`);
      return result;
    } catch (err) {
      console.error('Error cleaning up old tokens:', err);
    }
  }
}

export const pushNotificationService = new PushNotificationService();