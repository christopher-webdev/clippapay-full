// File: express_backend/routes/withdrawals.js
// FIXED: 
//  1. Accepts + validates currency (NGN | USDT)
//  2. Enforces correct minimums: ₦5,000 NGN / $5 USDT
//  3. Checks available balance (balance / usdtBalance) — NOT escrow
//  4. Debits available balance and puts into escrow on request creation
//     so funds are reserved while admin reviews; if admin marks Paid 
//     → escrow is permanently deducted; if Declined → escrow is released back

import express from 'express';
import Withdrawal from '../models/WithdrawalRequest.js';
import Wallet     from '../models/Wallet.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const MIN_NGN_WITHDRAWAL  = 5000;   // ₦5,000
const MIN_USDT_WITHDRAWAL = 5;      // $5

/**
 * POST /api/withdrawals
 * Create a new withdrawal request.
 * Body: {
 *   amount       : number
 *   currency     : 'NGN' | 'USDT'
 *   paymentMethod: 'bank' | 'usdt'
 *   // NGN bank fields:
 *   bank_name?      : string
 *   account_number? : string
 *   account_name?   : string
 *   // USDT fields:
 *   usdt_address? : string
 *   usdt_network? : string
 * }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      amount,
      currency,
      paymentMethod,
      bank_name,
      account_number,
      account_name,
      usdt_address,
      usdt_network,
    } = req.body;

    // ── Validate currency ──────────────────────────────────────────────────
    if (!currency || !['NGN', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'currency must be NGN or USDT.' });
    }

    // ── Validate amount ────────────────────────────────────────────────────
    const parsedAmount = currency === 'NGN' ? parseInt(amount) : parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    const minAmount = currency === 'NGN' ? MIN_NGN_WITHDRAWAL : MIN_USDT_WITHDRAWAL;
    if (parsedAmount < minAmount) {
      return res.status(400).json({
        error: `Minimum withdrawal is ${currency === 'NGN' ? `₦${minAmount.toLocaleString()}` : `$${minAmount} USDT`}.`,
      });
    }

    // ── Validate payment method ────────────────────────────────────────────
    if (!paymentMethod || !['bank', 'usdt'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'paymentMethod must be bank or usdt.' });
    }
    if (currency === 'NGN' && paymentMethod !== 'bank') {
      return res.status(400).json({ error: 'NGN withdrawals must use bank paymentMethod.' });
    }
    if (currency === 'USDT' && paymentMethod !== 'usdt') {
      return res.status(400).json({ error: 'USDT withdrawals must use usdt paymentMethod.' });
    }

    // ── Validate payment details ───────────────────────────────────────────
    if (paymentMethod === 'bank') {
      if (!bank_name || !account_number || !account_name) {
        return res.status(400).json({ error: 'bank_name, account_number and account_name are required.' });
      }
    } else {
      if (!usdt_address || !usdt_network) {
        return res.status(400).json({ error: 'usdt_address and usdt_network are required.' });
      }
    }

    // ── Check wallet balance ───────────────────────────────────────────────
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const availableBalance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
    if (parsedAmount > availableBalance) {
      return res.status(400).json({
        error: `Insufficient ${currency} balance. Available: ${
          currency === 'NGN'
            ? `₦${availableBalance.toLocaleString()}`
            : `$${availableBalance.toFixed(2)} USDT`
        }.`,
      });
    }

    // ── Lock funds into escrow while pending review ────────────────────────
    if (currency === 'NGN') {
      await wallet.lockEscrowNGN(parsedAmount);
    } else {
      await wallet.lockEscrowUSDT(parsedAmount);
    }

    // ── Create withdrawal record ───────────────────────────────────────────
    const w = new Withdrawal({
      user:          req.user._id,
      amount:        parsedAmount,
      currency,
      status:        'pending',
      paymentMethod,
      ...(paymentMethod === 'bank'
        ? { bank_name, account_number, account_name }
        : { usdt_address, usdt_network }),
    });

    await w.save();
    await w.populate('user', 'email firstName lastName');

    res.status(201).json(w);
  } catch (err) {
    console.error('withdrawal create error:', err);
    res.status(500).json({ error: err.message || 'Server error creating withdrawal.' });
  }
});

/**
 * GET /api/withdrawals
 * List current user's withdrawal requests.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Withdrawal.find({ user: req.user._id }).sort('-createdAt');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching withdrawals.' });
  }
});

export default router;


// // File: express_backend/routes/withdrawals.js

// import express from "express";
// import Withdrawal from "../models/WithdrawalRequest.js";
// import { requireAuth } from "../middleware/auth.js";

// const router = express.Router();

// /**
//  * POST /api/withdrawals
//  * Create a new withdrawal request.
//  * Body: {
//  *   amount: number,
//  *   paymentMethod: 'bank' | 'usdt',
//  *   bankName?: string,
//  *   accountNumber?: string,
//  *   accountName?: string,
//  *   usdtAddress?: string,
//  *   usdtNetwork?: string
//  * }
//  */
// router.post("/", requireAuth, async (req, res) => {
//   try {
//     const {
//       amount,
//       paymentMethod,
//       bankName,
//       accountNumber,
//       accountName,
//       usdtAddress,
//       usdtNetwork,
//     } = req.body;

//     // Basic validation
//     if (!amount || amount <= 0) {
//       return res.status(400).json({ error: "Invalid amount." });
//     }
//     if (paymentMethod === "bank") {
//       if (!bankName || !accountNumber || !accountName) {
//         return res.status(400).json({ error: "Bank details are required." });
//       }
//     } else if (paymentMethod === "usdt") {
//       if (!usdtAddress || !usdtNetwork) {
//         return res.status(400).json({ error: "USDT details are required." });
//       }
//     } else {
//       return res.status(400).json({ error: "Unsupported paymentMethod." });
//     }

//     // Build the new withdrawal
//     const w = new Withdrawal({
//       user: req.user._id,
//       amount,
//       status: "pending",
//     });

//     if (paymentMethod === "bank") {
//       w.paymentMethod = "bank";
//       w.bank_name = bankName;
//       w.account_number = accountNumber;
//       w.account_name = accountName;
//     } else {
//       w.paymentMethod = "usdt";
//       w.usdt_address = usdtAddress;
//       w.usdt_network = usdtNetwork;
//     }

//     await w.save();
//     // Populate user email/name if you like:
//     await w.populate("user", "email firstName lastName");

//     res.status(201).json(w);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error creating withdrawal." });
//   }
// });

// /**
//  * GET /api/withdrawals
//  * List current user's withdrawal requests.
//  */
// router.get("/", requireAuth, async (req, res) => {
//   try {
//     const list = await Withdrawal.find({ user: req.user._id }).sort(
//       "-createdAt",
//     );
//     res.json(list);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error fetching withdrawals." });
//   }
// });

// export default router;
