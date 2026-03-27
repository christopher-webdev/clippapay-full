import express from "express";
import multer from "multer";
import path from "path";
import Campaign from "../models/Campaign.js";
import Application from "../models/Application.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireAdvertiser } from "../middleware/auth.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import fs from "fs";

const router = express.Router();

// MULTER CONFIG – THUMBNAIL
const uploadDir = path.join(process.cwd(), "uploads/campaigns");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Ensured campaigns upload dir exists: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webm", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP images allowed"), false);
    }
  },
});

router.get("/active", requireAuth, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;

    const query = {
      // Explicitly match only 'active' — excludes legacy 'expired' and
      // any other stale status values left over from before the model change
      status: "active",
      // Deadline must still be in the future
      applicationDeadline: { $gt: new Date() },
    };

    if (category && category !== "All") query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("advertiser", "firstName lastName company rating profileImage")
        .lean(),
      Campaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("GET /active error:", err);
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

export default router;