// File: express_backend/routes/users.js

import express from 'express';
import User from '../models/User.js';
import { requireAuth} from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { requireAdminAuth } from '../middleware/adminAuth.js'
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();

/* ============================================================
   UPLOAD CONFIGURATION
============================================================ */

// Upload directory
const uploadDir = path.join(process.cwd(), 'uploads/profiles');
fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

// Multer middleware (50MB limit)
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

/* ================================
   ACCOUNT MANAGEMENT
================================ */

router.delete('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete profile image
    if (user.profileImage) {
      const imagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete sample videos
    if (user.sampleVideos && user.sampleVideos.length > 0) {
      user.sampleVideos.forEach(video => {
        const videoPath = path.join(process.cwd(), video);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      });
    }

    // Delete user document
    await User.findByIdAndDelete(req.user._id);

    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
/* ============================================================
   USER PROFILE ROUTES
============================================================ */

/**
 * GET /api/user/me
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -resetCode -resetExpires -emailOTP -otpExpires -pushTokens');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/user/profile
 * Update text fields + upload image/videos
 */
router.patch(
  '/profile',
  requireAuth,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'sampleVideos', maxCount: 3 }
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      /* ===== PROFILE IMAGE ===== */
      if (req.files?.profileImage) {
        if (user.profileImage) {
          const oldPath = path.join(process.cwd(), user.profileImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        user.profileImage = `/uploads/profiles/${req.files.profileImage[0].filename}`;
      }

      /* ===== SAMPLE VIDEOS ===== */
      if (req.files?.sampleVideos) {
        if (user.sampleVideos.length + req.files.sampleVideos.length > 3) {
          return res.status(400).json({
            error: 'Maximum 3 sample videos allowed'
          });
        }

        const newVideos = req.files.sampleVideos.map(
          file => `/uploads/profiles/${file.filename}`
        );

        user.sampleVideos.push(...newVideos);
      }

      /* ===== TEXT FIELDS ===== */
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.country !== undefined) user.country = req.body.country;
      if (req.body.company !== undefined) user.company = req.body.company;
      if (req.body.contactName !== undefined) user.contactName = req.body.contactName;
      if (req.body.bio !== undefined) user.bio = req.body.bio;
      if (req.body.paymentMethod !== undefined)
        user.paymentMethod = req.body.paymentMethod;

      if (req.body.payBankName !== undefined)
        user.payBankName = req.body.payBankName;

      if (req.body.payAccountNumber !== undefined)
        user.payAccountNumber = req.body.payAccountNumber;

      if (req.body.payAccountName !== undefined)
        user.payAccountName = req.body.payAccountName;

      if (req.body.usdtAddress !== undefined)
        user.usdtAddress = req.body.usdtAddress;

      if (req.body.usdtNetwork !== undefined)
        user.usdtNetwork = req.body.usdtNetwork;

      if (req.body.categories) {
        try {
          user.categories = JSON.parse(req.body.categories);
        } catch {
          return res.status(400).json({ error: 'Invalid categories format' });
        }
      }

      await user.save();
      res.json({ success: true, user });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Profile update failed' });
    }
  }
);

/**
 * DELETE /api/user/profile/image
 */
router.delete('/profile/image', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.profileImage) {
      const filePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      user.profileImage = null;
      await user.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * DELETE /api/user/profile/video/:filename
 */
router.delete('/profile/video/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const videoPath = `/uploads/profiles/${filename}`;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const filePath = path.join(process.cwd(), videoPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    user.sampleVideos = user.sampleVideos.filter(v => v !== videoPath);
    await user.save();

    res.json({ success: true, sampleVideos: user.sampleVideos });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

/* ============================================================
   PASSWORD
============================================================ */

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.validatePassword(oldPassword);
    if (!valid) return res.status(400).json({ error: 'Incorrect password' });

    await user.setPassword(newPassword);
    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

/* ============================================================
   ADMIN ROUTES
============================================================ */

/**
 * GET /api/users/all
 */
router.get('/all', requireAdminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash -resetCode -resetExpires -emailOTP -otpExpires -pushTokens')
      .sort('-createdAt');

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/users/:id
 */
router.patch('/:id', requireAdminAuth, async (req, res) => {
  try {
    const allowed = [
      'firstName', 'lastName', 'phone', 'country',
      'company', 'contactName', 'role',
      'isBlocked', 'rating', 'bio', 'categories'
    ];

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    for (let key of allowed) {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    }

    await user.save();
    res.json({ success: true, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.profileImage) {
      const imagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * GET /api/user/public/:userId
 * Get public profile of any user (for viewing profiles)
 */
router.get('/public/:userId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName lastName role rating profileImage bio categories company contactName');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/* ================================
   PUSH NOTIFICATIONS
================================ */

/**
 * POST /api/user/push-token
 * Save or update push notification token
 */
router.post('/push-token', requireAuth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Validate token format
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return res.status(400).json({ error: 'Invalid push token format' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize pushTokens array if needed
    if (!user.pushTokens) {
      user.pushTokens = [];
    }

    // Check if token exists
    const tokenIndex = user.pushTokens.findIndex(t => t.token === token);
    
    if (tokenIndex === -1) {
      // Add new token
      user.pushTokens.push({
        token,
        platform: platform || 'unknown',
        device: req.headers['user-agent'] || 'unknown',
        lastUsed: new Date(),
        createdAt: new Date()
      });

      // Keep only latest 5 tokens
      if (user.pushTokens.length > 5) {
        user.pushTokens = user.pushTokens
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 5);
      }
    } else {
      // Update existing token
      user.pushTokens[tokenIndex].lastUsed = new Date();
      user.pushTokens[tokenIndex].platform = platform || user.pushTokens[tokenIndex].platform;
    }

    await user.save();

    res.json({ 
      success: true, 
      message: 'Push token saved',
      tokenCount: user.pushTokens.length 
    });

  } catch (err) {
    console.error('Error saving push token:', err);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

/**
 * DELETE /api/user/push-token/:token
 * Remove a push token
 */
router.delete('/push-token/:token', requireAuth, async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.pushTokens) {
      user.pushTokens = user.pushTokens.filter(t => t.token !== token);
      await user.save();
    }

    res.json({ success: true, message: 'Push token removed' });

  } catch (err) {
    console.error('Error removing push token:', err);
    res.status(500).json({ error: 'Failed to remove push token' });
  }
});


/* ================================
   ADMIN ROUTES
================================ */

/**
 * GET /api/users/:id
 * Get single user by ID (admin only)
 */
router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -resetCode -resetExpires -emailOTP -otpExpires -pushTokens');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users/:id/block
 * Block/unblock user (admin only)
 */
router.post('/:id/block', requireAdminAuth, async (req, res) => {
  try {
    const { block } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.isBlocked = !!block;
    await user.save();
    
    res.json({ success: true, isBlocked: user.isBlocked });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', requireAdminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.setPassword(password);
    await user.save();
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


export default router;