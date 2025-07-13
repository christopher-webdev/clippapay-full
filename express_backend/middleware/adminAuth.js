import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();
const { JWT_SECRET } = process.env;

export async function requireAdminAuth(req, res, next) {
  let token = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    token = auth.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Always fetch from DB so you get up-to-date info:
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account is blocked.' });
    }
    // Check for BOTH admin and superadmin
    if (user.role !== 'admin' || !user.isSuperAdmin) {
      return res.status(403).json({ error: 'Super-admin access required.' });
    }
    req.user = user;
    return next();
  } catch (err) {
    console.error('JWT Error:', err);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
