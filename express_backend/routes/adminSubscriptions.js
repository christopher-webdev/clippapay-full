// // File: express_backend/routes/adminSubscriptions.js

// import express from 'express';
// import Subscription from '../models/Subscription.js';
// import User from '../models/User.js';
// import { requireAuth, requireAdmin } from '../middleware/auth.js';
// import { addMonths } from 'date-fns';

// const router = express.Router();

// /**
//  * GET /api/admin/subscriptions/pending
//  * List all subscriptions awaiting payment verification.
//  */
// router.get(
//   '/pending',
//   requireAuth,
//   requireAdmin,
//   async (req, res) => {
//     try {
//       const list = await Subscription
//         .find({ paymentStatus: 'pending' })
//         .populate('plan')
//         .populate('user', 'email');
//       res.json(list);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Error loading pending subscriptions.' });
//     }
//   }
// );

// /**
//  * POST /api/admin/subscriptions/:id/verify
//  * Body: { action: 'approve' | 'reject' }
//  * Approve: marks subscription active, sets start/end dates.
//  * Reject: marks paymentStatus = 'rejected', status = 'cancelled'.
//  */
// router.post(
//   '/:id/verify',
//   requireAuth,
//   requireAdmin,
//   async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { action } = req.body; // 'approve' or 'reject'
//       const sub = await Subscription.findById(id).populate('plan');
//       if (!sub) return res.status(404).json({ error: 'Subscription not found.' });
//       if (sub.paymentStatus !== 'pending') {
//         return res.status(400).json({ error: 'Already processed.' });
//       }

//       if (action === 'approve') {
//         sub.paymentStatus = 'verified';
//         sub.status        = 'active';
//         sub.verifiedAt    = new Date();
//         sub.startDate     = sub.verifiedAt;
//         // set endDate one month from now (or use plan.durationMonths)
//         const months = sub.plan.durationMonths || 1;
//         sub.endDate = addMonths(sub.startDate, months);
//         await sub.save();

//         // Update user's currentSubscription
//         await User.findByIdAndUpdate(sub.user, { currentSubscription: sub._id });
//       } else {
//         sub.paymentStatus = 'rejected';
//         sub.status        = 'cancelled';
//         sub.verifiedAt    = new Date();
//         await sub.save();
//       }

//       res.json(sub);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Error verifying subscription.' });
//     }
//   }
// );

// export default router;
// File: express_backend/routes/adminSubscriptions.js

import express from 'express';
import fs from 'fs';
import path from 'path';
import Subscription from '../models/Subscription.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1) List all subscriptions
router.get(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const list = await Subscription
        .find()
        .populate('plan')
        .populate('user', 'email');
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error loading subscriptions.' });
    }
  }
);

// 2) (Optional) list only pending
router.get(
  '/pending',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const list = await Subscription
        .find({ paymentStatus: 'pending' })
        .populate('plan')
        .populate('user', 'email');
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error loading pending.' });
    }
  }
);

// 3) Approve / reject
router.post(
  '/:id/verify',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const sub = await Subscription.findById(id).populate('plan');
      if (!sub) return res.status(404).json({ error: 'Not found.' });

      if (action === 'approve') {
        sub.paymentStatus = 'verified';
        sub.status        = 'active';
        sub.verifiedAt    = new Date();
        sub.startDate     = sub.verifiedAt;
        const months      = sub.plan.durationMonths || 1;
        sub.endDate       = new Date(sub.startDate);
        sub.endDate.setMonth(sub.endDate.getMonth() + months);
      } else {
        sub.paymentStatus = 'rejected';
        sub.status        = 'cancelled';
        sub.verifiedAt    = new Date();
      }
      await sub.save();
      return res.json(sub);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error verifying.' });
    }
  }
);

// 4) Delete subscription + its receipt file
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const sub = await Subscription.findById(id);
      if (!sub) return res.status(404).json({ error: 'Not found.' });

      // delete the receipt file
      if (sub.receiptUrl) {
        const filePath = path.join(process.cwd(), sub.receiptUrl);
        fs.unlink(filePath, err => {
          if (err) console.error('FS error deleting:', err);
        });
      }

      await sub.deleteOne();
      res.json({ message: 'Deleted.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Delete failed.' });
    }
  }
);

export default router;
