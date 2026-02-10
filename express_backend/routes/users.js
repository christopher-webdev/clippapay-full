import express from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { requireAdminAuth } from '../middleware/adminAuth.js'

const router = express.Router();

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
