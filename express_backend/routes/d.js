
import express from "express";
import multer from "multer";
import path from "path";
import Campaign from "../models/Campaign.js";
import Application from "../models/Application.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireAdvertiser } from "../middleware/auth.js"; // assume you have role middleware
import { requireAdminAuth } from "../middleware/adminAuth.js";
import fs from "fs";

const router = express.Router();
// MULTER CONFIG – THUMBNAIL
const uploadDir = path.join(process.cwd(), "uploads/campaigns");

// Make sure folder exists (redundant if you use the startup function, but safe)
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
    const { category, page = 1, limit = 20 } = req.query;

    const query = { status: "active" };
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate(
          "advertiser",
          "firstName lastName company rating profileImage",
        )
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
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

export default router;
