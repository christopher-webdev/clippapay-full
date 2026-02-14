// File: express_backend/routes/notifications.js

import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications for logged-in user (paginated)
 * Query:
 *   page=1
 *   limit=20
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id })
    ]);

    res.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});


/**
 * POST /api/notifications/:id/read
 * Mark one notification as read
 */
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notif.read = true;
    notif.readAt = new Date();
    await notif.save();

    res.json({
      success: true,
      data: notif
    });

  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});


/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({ success: true });

  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});


export default router;
