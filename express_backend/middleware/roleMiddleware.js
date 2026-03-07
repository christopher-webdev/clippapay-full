// middleware/roleMiddleware.js
import { requireAuth } from './auth.js';

export const requireAdvertiser = [requireAuth, (req, res, next) => {
  if (req.user.role !== 'advertiser') {
    return res.status(403).json({ error: 'Advertiser access only' });
  }
  next();
}];

export const requireClipper = [requireAuth, (req, res, next) => {
  if (req.user.role !== 'clipper') {
    return res.status(403).json({ error: 'Clipper access only' });
  }
  next();
}];