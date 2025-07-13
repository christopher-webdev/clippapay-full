// File: express_backend/routes/notifications.js

import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Return all notifications for the authenticated user, newest first.
 */
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const notifs = await Notification
        .find({ user: req.user._id })
        .sort('-createdAt');
      res.json(notifs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  }
);

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.post(
  '/:id/read',
  requireAuth,
  async (req, res) => {
    try {
      const notif = await Notification.findOne({
        _id: req.params.id,
        user: req.user._id
      });
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      await notif.markRead();
      res.json(notif);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark notification read' });
    }
  }
);

export default router;
