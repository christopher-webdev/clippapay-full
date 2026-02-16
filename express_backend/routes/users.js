import express from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { requireAdminAuth } from '../middleware/adminAuth.js'


// Near the top of users.js
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import ClipperProfile from '../models/ClipperProfile.js';

// Create upload folder
const clipperDir = path.join(process.cwd(), 'uploads/clipper-profiles');
fs.mkdirSync(clipperDir, { recursive: true });

const clipperStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, clipperDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const clipperUpload = multer({
  storage: clipperStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (jpg/png/webp) and videos (mp4/mov) allowed'), false);
  }
});

const router = express.Router();

// GET /api/clipper-profile/premium
// Returns list of premium clippers with basic info + profile
router.get('/clipper-profile/premium', requireAuth, async (req, res) => {
  try {
    // Only allow advertisers or admins to see this list
    if (req.user.role !== 'advertiser' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const premiumClippers = await User.find({
      role: 'clipper',
      isPremiumCreator: true,
      isBlocked: false,
    }).select('_id firstName lastName rating isPremiumCreator');

    const profiles = await Promise.all(
      premiumClippers.map(async (user) => {
        let profile = await ClipperProfile.findOne({ user: user._id });
        if (!profile) {
          profile = { categories: [], ratePerVideo: 0, expectedDelivery: '', completedProjects: 0 };
        }
        return {
          id: user._id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Creator',
          rating: user.rating || 0,
          ...profile.toObject(),
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            rating: user.rating,
          }
        };
      })
    );

    res.json(profiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch premium creators' });
  }
});



// GET own profile (works for all clippers, creates if not exists)
router.get('/clipper-profile/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'clipper') {
    return res.status(403).json({ error: 'Only clippers can have profiles' });
  }

  let profile = await ClipperProfile.findOne({ user: req.user._id });
  if (!profile) {
    profile = new ClipperProfile({ user: req.user._id });
    await profile.save();
  }

  res.json(profile);
});

// PATCH own profile
router.patch(
  '/clipper-profile/me',
  requireAuth,
  clipperUpload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'sampleVideo', maxCount: 1 },
  ]),
  async (req, res) => {
    if (req.user.role !== 'clipper') {
      return res.status(403).json({ error: 'Only clippers can update profiles' });
    }

    let profile = await ClipperProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new ClipperProfile({ user: req.user._id });
    }

    // Always allow sample video & profile image
    if (req.files?.profileImage) {
      if (profile.profileImage) {
        try { fs.unlinkSync(path.join(process.cwd(), profile.profileImage)); } catch {}
      }
      profile.profileImage = `/uploads/clipper-profiles/${req.files.profileImage[0].filename}`;
    }

    if (req.files?.sampleVideo) {
      if (profile.sampleVideo) {
        try { fs.unlinkSync(path.join(process.cwd(), profile.sampleVideo)); } catch {}
      }
      profile.sampleVideo = `/uploads/clipper-profiles/${req.files.sampleVideo[0].filename}`;
    }

    // Premium-only fields
    if (req.user.isPremiumCreator) {
      if (req.body.bio !== undefined) profile.bio = req.body.bio;
      if (req.body.categories) profile.categories = JSON.parse(req.body.categories);
      if (req.body.ratePerVideo) profile.ratePerVideo = Number(req.body.ratePerVideo);
      if (req.body.expectedDelivery) profile.expectedDelivery = req.body.expectedDelivery;
      if (req.body.completedProjects) profile.completedProjects = Number(req.body.completedProjects);
    }

    await profile.save();
    res.json(profile);
  }
);


// GET public profile (for advertisers) - View any clipper profile
// GET public profile (for advertisers) - View any clipper profile
router.get('/clipper-profile/:userId', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    
    // Check if user exists and is a clipper
    if (!targetUser || targetUser.role !== 'clipper') {
      return res.status(404).json({ error: 'Clipper not found' });
    }

    // Try to find profile, but don't fail if it doesn't exist
    const profile = await ClipperProfile.findOne({ user: targetUser._id });
    
    // Return combined data - always return something, even if profile is null
    res.json({
      // Profile fields (with defaults if profile is null)
      bio: profile?.bio || '',
      categories: profile?.categories || [],
      sampleVideo: profile?.sampleVideo || null,
      ratePerVideo: profile?.ratePerVideo || 0,
      expectedDelivery: profile?.expectedDelivery || '',
      completedProjects: profile?.completedProjects || 0,
      profileImage: profile?.profileImage || targetUser.profileImage || null,
      
      // User fields
      user: {
        firstName: targetUser.firstName || '',
        lastName: targetUser.lastName || '',
        rating: targetUser.rating || 0,
        isPremiumCreator: targetUser.isPremiumCreator || false,
      }
    });
  } catch (err) {
    console.error('Error fetching clipper profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


/**
 * Get current user's own profile.
 * GET /api/user/me
 */
router.get('/me', requireAuth, async (req, res) => {
  const u = await User.findById(req.user._id).select('-passwordHash');
  res.json(u);
});

/**
 * Update user profile (firstName, lastName, phone, country).
 * PATCH /api/user/me
 * Body: { firstName, lastName, phone, country }
 */
/**
 * Update user profile for ANY role (firstName, lastName, phone, country, company, contactName).
 * PATCH /api/user/me
 * Body: { firstName, lastName, phone, country, company, contactName }
 */
router.patch('/me', requireAuth, async (req, res) => {
  const allowed = [
    'firstName', 'lastName', 'phone', 'country',
    'company', 'contactName'
  ];
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  for (let key of allowed) {
    if (req.body[key] !== undefined) {
      user[key] = req.body[key];
    }
  }
  await user.save();
  res.json({
    success: true,
    user: {
      id: user._id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      email: user.email,
      company: user.company,
      contactName: user.contactName,
    }
  });
});


/**
 * Change user password (requires old password for safety).
 * POST /api/user/change-password
 * Body: { oldPassword, newPassword }
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid password.' });
  }
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await user.validatePassword(oldPassword);
  if (!valid) return res.status(400).json({ error: 'Old password is incorrect.' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true });
});

/**
 * Delete own account (cannot undo!).
 * DELETE /api/user/me
 */
router.delete('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await User.deleteOne({ _id: req.user._id });
  // Optionally, delete associated data (wallet, clips, etc) here!
  res.json({ success: true });
});


// ---------------------------
// ADMIN ROUTES
// ---------------------------
router.get('/all', requireAdminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').limit(100000000000);
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

/**
 * POST /api/users/all
 * Bulk admin actions on users.
 * Body: { action: "block"|"unblock"|"delete"|"update", userIds: [..], update?: {...} }
 * - block/unblock: set isBlocked for all in userIds
 * - delete: delete all in userIds
 * - update: update fields for all in userIds (fields in update obj)
 */
router.post('/all', requireAdminAuth, async (req, res) => {
  const { action, userIds, update } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds required.' });
  }

  try {
    let result;
    switch (action) {
      case 'block':
        result = await User.updateMany({ _id: { $in: userIds } }, { isBlocked: true });
        break;
      case 'unblock':
        result = await User.updateMany({ _id: { $in: userIds } }, { isBlocked: false });
        break;
      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      case 'update':
        if (!update || typeof update !== 'object') {
          return res.status(400).json({ error: 'update fields required.' });
        }
        result = await User.updateMany({ _id: { $in: userIds } }, update);
        break;
      default:
        return res.status(400).json({ error: 'Unknown action.' });
    }
    res.json({ success: true, action, userIds, result });
  } catch (err) {
    console.error('Error in /users/all POST:', err);
    res.status(500).json({ error: 'Bulk action failed' });
  }
});

/**
 * List users, with optional filter.
 * GET /api/users?role=clipper
 */
router.get('/', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.email) filter.email = req.query.email;
  if (req.query.isBlocked) filter.isBlocked = req.query.isBlocked === 'true';
  const users = await User.find(filter).select('-passwordHash').limit(100);
  res.json(users);
});

/**
 * Get single user detail (admin).
 * GET /api/users/:id
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

/**
 * Admin: delete any user by ID.
 * DELETE /api/users/:id
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.user._id.equals(req.params.id)) {
    return res.status(403).json({ error: 'Cannot delete own admin account.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await User.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

/**
 * Admin: ban or unban user.
 * POST /api/users/:id/block
 * Body: { block: true/false }
 */
router.post('/:id/block', requireAuth, requireAdmin, async (req, res) => {
  const { block } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isBlocked = !!block;
  await user.save();
  res.json({ success: true, isBlocked: user.isBlocked });
});

/**
 * Admin: set user password (reset).
 * POST /api/users/:id/reset-password
 * Body: { password }
 */
router.post('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password too short.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ success: true });
});

// PATCH /api/users/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const allowed = [
    'firstName', 'lastName', 'phone', 'country', 'company', 'contactName', 'isBlocked', 'role', 'isPremiumCreator'
  ];
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  for (let key of allowed) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }
  await user.save();
  res.json({ success: true, user });
});



export default router;
