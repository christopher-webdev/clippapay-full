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
import campaignsRouter from './routes/campaigns.js';
import submissionsRouter from './routes/submissions.js';
import clippersRouter from './routes/clippers.js';
import walletRouter from './routes/wallet.js';
import txRouter from './routes/transactions.js';
import wdrRouter from './routes/withdrawals.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';
import advertiserStatsRouter from './routes/advertiserStats.js';
import plansRouter from './routes/plans.js';
import subscriptionRouter from './routes/subscription.js';
import adminSubscriptionsRouter from './routes/adminSubscriptions.js';
import adminStatsRouter from './routes/adminStats.js';
import adminDepositsRouter from './routes/adminDeposits.js';
import adminWithdrawalsRouter from './routes/adminWithdrawals.js';
import adminSettingsRouter from './routes/adminSettings.js';
import { ensurePlatformWallet } from './seeds/createPlatformWallet.js';
import adminSubmissionsRouter from './routes/adminSubmissions.js';
import userRoutes from './routes/users.js';
import adminCampaignsRouter from './routes/adminCampaigns.js';
import clipRoutes from './routes/clips.js';

// Model for seeding
import SubscriptionPlan from './models/SubscriptionPlan.js';
import seedAdWorkers from './seeds/createAdWorkers.js';
import cleanupOldVideos from './scripts/cleanupOldVideos.js';

dotenv.config();
const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// 1. Configure uploads directory
const uploadsRoot = path.join(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  console.log('Created uploads directory');
}

// 2. Middleware setup
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
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

    // Similar logic as verify: check if processed, create deposit, credit wallet, etc.
    // To identify user, add metadata in PaystackButton: metadata={{ userId: user._id }} (fetch _id from /api/user)
    // For now, log or skip if not critical.
    console.log('Webhook success:', data);

    // Example: Find by reference and approve if pending
    const deposit = await DepositRequest.findOne({ reference });
    if (deposit && deposit.status === 'pending') {
      deposit.status = 'approved';
      await deposit.save();
      // Credit wallet, etc. (same as above)
    }
  }

  res.sendStatus(200);
});
// 3. Static file serving (must come before routes)
app.use('/uploads', express.static(uploadsRoot, {
  index: false,  // disable directory listing
  maxAge: '1d',  // cache files for 1 day
  setHeaders: (res, filePath) => {
    // Use Node's path.extname for cleaner code
    const ext = path.extname(filePath).slice(1);
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
      pdf: 'application/pdf',
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// 4. Database connection
mongoose
  .connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(async () => {
    console.log('MongoDB connected');
    await ensurePlatformWallet();
    console.log('Platform wallet ensured');

    await cleanupOldVideos();
  
    // Schedule daily cleanup at 2 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        cleanupOldVideos();
      }
    }, 60 * 1000); // Check every minute
    
    // Seed ad-workers
    try {
      await seedAdWorkers();
      console.log('✅ Ad-worker seeding complete');
    } catch (err) {
      console.error('❌ Error seeding ad-workers:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// 5. API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/clippers', clippersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/transactions', txRouter);
app.use('/api/withdrawals', wdrRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/advertiser', advertiserStatsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/admin/subscriptions', adminSubscriptionsRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/deposits', adminDepositsRouter);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin-campaigns', adminCampaignsRouter);
app.use('/api/admin/withdrawals', adminWithdrawalsRouter);
app.use('/api/clip', clipRoutes);
app.use('/api/user', userRoutes);

// 6. Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 7. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsRoot}`);

});
