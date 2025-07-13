import express from 'express';
import path from 'path';
import multer from 'multer';
import Wallet from '../models/Wallet.js';
import DepositRequest from '../models/DepositRequest.js';
import { requireAuth } from '../middleware/auth.js';
import PlatformSetting from '../models/PlatformSetting.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'

const router = express.Router();

// Multer for deposit receipts
const depositStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'deposits'),
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const depositUpload = multer({ storage: depositStorage });

/**
 * POST /api/wallet/deposits
 * User requests to fund their wallet.
 * FormData: amount, receipt(file)
 */
router.post(
  '/deposits',
  requireAuth,
  depositUpload.single('receipt'),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { amount } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: 'Receipt is required.' });
      }
      const receiptUrl = `/uploads/deposits/${req.file.filename}`;
      const dr = await DepositRequest.create({
        user: userId,
        amount: parseFloat(amount),
        receiptUrl
      });
      res.status(201).json(dr);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error creating deposit request.' });
    }
  }
);

/**
 * GET /api/wallet/deposits
 * List current user’s deposit requests.
 */
router.get(
  '/deposits',
  requireAuth,
  async (req, res) => {
    try {
      const list = await DepositRequest
        .find({ user: req.user._id })
        .sort('-createdAt');
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching deposit requests.' });
    }
  }
);

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      // Try to find existing wallet
      let wallet = await Wallet.findOne({ user: req.user._id });
      // If none, create an empty one
      if (!wallet) {
        wallet = await Wallet.create({
          user: req.user._id,
          balance: 0,
          escrowLocked: 0
        });
      }
      // Only expose the two fields
      res.json({
        balance: wallet.balance,
        escrowLocked: wallet.escrowLocked
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error fetching wallet.' });
    }
  }
);

// File: express_backend/routes/platformSettings.js




// GET /api/platform-settings/bank-details
router.get('/bank-details', requireAuth, async (req, res) => {
  try {
    const settings = await PlatformSetting.find({
      key: { $in: ['bankName', 'bankAccountNumber', 'bankAccountName'] }
    }).lean();

    const result = {
      bankName: settings.find(s => s.key === 'bankName')?.value || '',
      accountNumber: settings.find(s => s.key === 'bankAccountNumber')?.value || '',
      accountName: settings.find(s => s.key === 'bankAccountName')?.value || ''
    };

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});


export default router;
