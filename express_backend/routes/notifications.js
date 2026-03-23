// routes/notifications.js  — complete, all endpoints wired
import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// GET /api/notifications
// Get paginated notifications for logged-in user
// ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    res.json({
      notifications,          // frontend service expects this key
      data: notifications,    // keep backwards compat with old screens
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────────────────
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/notifications/read-all   (also alias mark-all-read)
// Mark all as read
// ─────────────────────────────────────────────────────────
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Reset badge count on all user push tokens
    await _clearBadge(req.user._id);

    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.post('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    await _clearBadge(req.user._id);
    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/notifications/bulk-delete
// Delete read or all notifications
// ─────────────────────────────────────────────────────────
router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { type } = req.body; // 'read' | 'all'
    const filter = { user: req.user._id };
    if (type === 'read') filter.read = true;

    const result = await Notification.deleteMany(filter);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/notifications/:id
// Get single notification
// ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    console.error('Get notification error:', err);
    res.status(500).json({ error: 'Failed to get notification' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/notifications/:id/read   (also PATCH for service compat)
// Mark single notification as read
// ─────────────────────────────────────────────────────────
const _markOneRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    if (!notif.read) {
      notif.read  = true;
      notif.readAt = new Date();
      await notif.save();
    }

    res.json({ success: true, data: notif });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
};

router.post('/:id/read', requireAuth, _markOneRead);
router.patch('/:id/read', requireAuth, _markOneRead);

// ─────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// Delete single notification
// ─────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ─────────────────────────────────────────────────────────
// Internal helper — clear badge on all push tokens for user
// ─────────────────────────────────────────────────────────
async function _clearBadge(userId) {
  try {
    const user = await User.findById(userId).select('pushTokens').lean();
    if (!user?.pushTokens?.length) return;

    const { Expo } = await import('expo-server-sdk').catch(() => ({ Expo: null }));
    if (!Expo) return;

    const expo = new Expo();
    const messages = user.pushTokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        badge: 0,
      }));

    if (messages.length) {
      await expo.sendPushNotificationsAsync(messages);
    }
  } catch (_) {
    // badge clear is best-effort
  }
}

export default router;