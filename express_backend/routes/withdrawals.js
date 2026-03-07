// File: express_backend/routes/withdrawals.js

import express from "express";
import Withdrawal from "../models/WithdrawalRequest.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/withdrawals
 * Create a new withdrawal request.
 * Body: {
 *   amount: number,
 *   paymentMethod: 'bank' | 'usdt',
 *   bankName?: string,
 *   accountNumber?: string,
 *   accountName?: string,
 *   usdtAddress?: string,
 *   usdtNetwork?: string
 * }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      bankName,
      accountNumber,
      accountName,
      usdtAddress,
      usdtNetwork,
    } = req.body;

    // Basic validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount." });
    }
    if (paymentMethod === "bank") {
      if (!bankName || !accountNumber || !accountName) {
        return res.status(400).json({ error: "Bank details are required." });
      }
    } else if (paymentMethod === "usdt") {
      if (!usdtAddress || !usdtNetwork) {
        return res.status(400).json({ error: "USDT details are required." });
      }
    } else {
      return res.status(400).json({ error: "Unsupported paymentMethod." });
    }

    // Build the new withdrawal
    const w = new Withdrawal({
      user: req.user._id,
      amount,
      status: "pending",
    });

    if (paymentMethod === "bank") {
      w.paymentMethod = "bank";
      w.bank_name = bankName;
      w.account_number = accountNumber;
      w.account_name = accountName;
    } else {
      w.paymentMethod = "usdt";
      w.usdt_address = usdtAddress;
      w.usdt_network = usdtNetwork;
    }

    await w.save();
    // Populate user email/name if you like:
    await w.populate("user", "email firstName lastName");

    res.status(201).json(w);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating withdrawal." });
  }
});

/**
 * GET /api/withdrawals
 * List current user's withdrawal requests.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const list = await Withdrawal.find({ user: req.user._id }).sort(
      "-createdAt",
    );
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching withdrawals." });
  }
});

export default router;
