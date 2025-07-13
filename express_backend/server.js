// File: express_backend/index.js

import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter               from './routes/auth.js';
import adminAuthRouter          from './routes/adminAuth.js';
import campaignsRouter          from './routes/campaigns.js';
import submissionsRouter        from './routes/submissions.js';
import clippersRouter           from './routes/clippers.js';
import walletRouter             from './routes/wallet.js';
import txRouter                 from './routes/transactions.js';
import wdrRouter                from './routes/withdrawals.js';
import notificationsRouter      from './routes/notifications.js';
import settingsRouter           from './routes/settings.js';
import advertiserStatsRouter    from './routes/advertiserStats.js';
import plansRouter              from './routes/plans.js';
import subscriptionRouter       from './routes/subscription.js';
import adminSubscriptionsRouter from './routes/adminSubscriptions.js';
import adminStatsRouter         from './routes/adminStats.js';
import adminDepositsRouter from './routes/adminDeposits.js';
import adminWithdrawalsRouter from './routes/adminWithdrawals.js';
import adminSettingsRouter from './routes/adminSettings.js';
import { ensurePlatformWallet } from './seeds/createPlatformWallet.js';
import adminSubmissionsRouter from './routes/adminSubmissions.js';
import userRoutes              from './routes/users.js';
import adminCampaignsRouter from './routes/adminCampaigns.js'


import clipRoutes     from './routes/clips.js';
// Model for seeding
import SubscriptionPlan         from './models/SubscriptionPlan.js';

dotenv.config();
const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// 1) Cookie parsing
app.use(cookieParser());

// 2) CORS in dev
if (isDev) {
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
}

// 3) JSON bodies
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// 4) Connect & seed plans
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');

    await ensurePlatformWallet();
    console.log('Platform wallet ensured');
  })
  .catch(err => console.error('MongoDB connection error:', err));

import seedAdWorkers from './seeds/createAdWorkers.js';
// 2) seed ad-workers
try {
  await seedAdWorkers();
  console.log('✅ Ad-worker seeding complete');
} catch (err) {
  console.error('❌ Error seeding ad-workers:', err);
}

// 5) Serve receipts uploads
app.use(
  '/uploads/receipts',
  express.static(path.join(process.cwd(), 'uploads', 'receipts'))
);

// right after you serve /uploads/receipts, add:
app.use(
  '/uploads/deposits',
  express.static(path.join(process.cwd(), 'uploads', 'deposits'))
);
// serve uploaded videos
app.use(
  '/uploads/videos',
  express.static(path.join(process.cwd(), 'uploads/videos'))
);
// Static serve for videos & clips
// app.use('/uploads/videos', express.static(path.join(process.cwd(),'uploads/videos')));
app.use('/uploads/clips',  express.static(path.join(process.cwd(),'uploads/clips')))
// Static serve for proof uploads
app.use('/uploads/proof',  express.static(path.join(process.cwd(),'uploads/proof')));
app.use('/uploads/proofs',  express.static(path.join(process.cwd(),'uploads/proofs')));



// …
app.use('/api/admin/settings', adminSettingsRouter);
// 6) Mount all routers
app.use('/api/auth',                  authRouter);
app.use('/api/admin',                 adminAuthRouter);
app.use('/api/campaigns',             campaignsRouter);
app.use('/api/submissions',           submissionsRouter);
app.use('/api/clippers',           clippersRouter);
app.use('/api/wallet',                walletRouter);
app.use('/api/transactions',          txRouter);
app.use('/api/withdrawals',           wdrRouter);
app.use('/api/notifications',         notificationsRouter);
app.use('/api/admin/settings',        settingsRouter);
app.use('/api/advertiser',            advertiserStatsRouter);
app.use('/api/plans',                 plansRouter);
app.use('/api/subscriptions',         subscriptionRouter);
app.use('/api/admin/subscriptions',   adminSubscriptionsRouter);
app.use('/api/admin/stats',        adminStatsRouter);
app.use('/api/admin/deposits', adminDepositsRouter);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin-campaigns', adminCampaignsRouter);
 
// … after you already have other app.use(…) calls:
app.use('/api/admin/withdrawals', adminWithdrawalsRouter);

app.use('/api/clip', clipRoutes);
app.use('/api/user', userRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 7) Serve React build in prod
if (!isDev) {
  const buildPath = path.resolve(process.cwd(), 'build');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 8) Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
