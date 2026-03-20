import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';


// Import routes
import authRouter from './routes/auth.js';
import adminAuthRouter from './routes/adminAuth.js';
import submissionsRouter from './routes/submissions.js';
import clippersRouter from './routes/clippers.js';
import walletRouter from './routes/wallet.js';
import txRouter from './routes/transactions.js';
import wdrRouter from './routes/withdrawals.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';
import advertiserStatsRouter from './routes/advertiserStats.js';
import adminSubscriptionsRouter from './routes/adminSubscriptions.js';
import adminStatsRouter from './routes/adminStats.js';
import adminDepositsRouter from './routes/adminDeposits.js';
import adminWithdrawalsRouter from './routes/adminWithdrawals.js';
import { ensurePlatformWallet } from './seeds/createPlatformWallet.js';
import adminSubmissionsRouter from './routes/adminSubmissions.js';
import userRoutes from './routes/users.js';
import adminCampaignsRouter from './routes/adminCampaigns.js';
import clipRoutes from './routes/clips.js';
import campaignsRoute from './routes/campaigns.js';
import applicationsRouter from './routes/applications.js';
import disputesRouter from './routes/disputes.js';
import dRouter from './routes/d.js';
import clippingRouter from './routes/clipping.js';                        // clipper-side browse/submit
import advertiserClippingRouter from './routes/advertiser_clipping.js';   // ← NEW advertiser-side


// Model for seeding
import seedAdWorkers from './seeds/createAdWorkers.js';
import cleanupOldVideos from './scripts/cleanupOldVideos.js';
import telegramRouter from './routes/telegram.js';

import cron from 'node-cron';
import { startExpirationChecker } from './services/expirationChecker.js';


dotenv.config();
const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// 1. Configure uploads directory
const uploadsRoot = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  console.log('Created uploads directory');
}

// 2. Middleware setup
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/paystack-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET;
  const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const amount = data.amount / 100;
    console.log('Webhook success:', data);

    const deposit = await DepositRequest.findOne({ reference });
    if (deposit && deposit.status === 'pending') {
      deposit.status = 'approved';
      await deposit.save();
    }
  }

  res.sendStatus(200);
});

// 3. Static file serving
app.use('/uploads', express.static(uploadsRoot, {
  index: false,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).slice(1);
    const mimeTypes = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
    };
    if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);
  }
}));

// 4. Database connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    await ensurePlatformWallet();
    console.log('Platform wallet ensured');

    await cleanupOldVideos();

    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) cleanupOldVideos();
    }, 60 * 1000);

    startExpirationChecker();
    console.log('✅ Expiration checker started (every 5 min)');

    try {
      await seedAdWorkers();
      console.log('✅ Ad-worker seeding complete');
    } catch (err) {
      console.error('❌ Error seeding ad-workers:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// 5. API Routes
// ─── IMPORTANT: specific routes BEFORE wildcard routers ──────────────────────
app.use('/api/clipping', clippingRouter);                           // clipper browse/submit  → /api/clipping/*
app.use('/api/campaigns/clipping', advertiserClippingRouter);       // advertiser manage      → /api/campaigns/clipping/*  ← MUST be before /api/campaigns
app.use('/api/campaigns', campaignsRoute);                          // UGC campaigns (has /:id wildcard)
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/d', dRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/clippers', clippersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/transactions', txRouter);
app.use('/api/withdrawals', wdrRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/advertiser', advertiserStatsRouter);
app.use('/api/admin/subscriptions', adminSubscriptionsRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/deposits', adminDepositsRouter);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin-campaigns', adminCampaignsRouter);
app.use('/api/admin/withdrawals', adminWithdrawalsRouter);
app.use('/api/clip', clipRoutes);
app.use('/api/user', userRoutes);
app.use('/telegram', telegramRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/disputes', disputesRouter);

// 6. Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('/', (req, res) => {
  res.json({ message: 'Clippapay API is live! 🚀' });
});

// 7. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsRoot}`);
});