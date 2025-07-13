import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();
const { JWT_SECRET } = process.env;

export async function requireAuth(req, res, next) {
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
    req.user = user;
    return next();
  } catch (err) {
    console.error('JWT Error:', err);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// role-based guards remain the same:
// role-based guards (ALWAYS check req.user before using)
export function requireClipper(req, res, next) {
  if (!req.user || req.user.role !== 'clipper')
    return res.status(403).json({ error: 'Clipper access required.' });
  next();
}
export function requireAdvertiser(req, res, next) {
  if (!req.user || req.user.role !== 'advertiser')
    return res.status(403).json({ error: 'Advertiser access required.' });
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && !req.user.isSuperAdmin))
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}
// export function requireSuperAdmin(req, res, next) {
//   if (!req.user || req.user.role !== 'admin' || !req.user.isSuperAdmin)
//     return res.status(403).json({ error: 'Super-admin access required.' });
//   next();
// }
export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin' || !req.user.isSuperAdmin)
    return res.status(403).json({ error: 'Super-admin access required.' });
  next();
}
