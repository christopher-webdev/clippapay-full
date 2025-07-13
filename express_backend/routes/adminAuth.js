// File: express_backend/routes/adminAuth.js

import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * POST /api/admin/signup
 * Create the very first super-admin. After one exists, this endpoint is forbidden.
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, confirm } = req.body;
    if (password !== confirm) {
      return res.status(400).json({ error: 'Passwords must match.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password too short.' });
    }

    // Only allow if no super-admin exists
    const superCount = await User.countDocuments({ isSuperAdmin: true });
    if (superCount > 0) {
      return res.status(403).json({ error: 'Super-admin already exists.' });
    }

    // Prevent duplicate emails
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email already in use.' });
    }

    const user = new User({ role: 'admin', isSuperAdmin: true, email });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ message: 'Super-admin created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/admin/login
 * Login for admins & super-admins.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required.' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Allow all admin (super or not) to login here:
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, isSuperAdmin: user.isSuperAdmin, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set cookie for admin panel security
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Also return token in JSON for debugging/dev (optional)
    res.json({ message: 'Logged in.', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});


/**
 * POST /api/admin/workers
 * Super-admin only: create a new admin-worker or another super-admin.
 */
router.post(
  '/workers',
  requireAuth,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { email, password, confirm, isSuperAdmin = false } = req.body;
      if (password !== confirm) {
        return res.status(400).json({ error: 'Passwords must match.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password too short.' });
      }
      if (await User.findOne({ email })) {
        return res.status(400).json({ error: 'Email already in use.' });
      }

      const user = new User({
        role: 'admin',
        isSuperAdmin: Boolean(isSuperAdmin),
        email
      });
      await user.setPassword(password);
      await user.save();

      res.status(201).json({
        message: 'Admin user created.',
        user: {
          id: user._id,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

export default router;
