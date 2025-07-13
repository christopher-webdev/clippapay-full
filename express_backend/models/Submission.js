// File: express_backend/models/Submission.js

import mongoose from 'mongoose';

// Sub‐document for each view report/update
const updateSchema = new mongoose.Schema({
  proof_url:      String,   // social post link
  platform:       String,   // e.g. 'TikTok'
  views_reported: { type: Number, required: true },
  verifiedViews:  Number,   // set by admin or automated check
  status: {
    type: String,
    enum: ['pending','approved','rejected'],
    default: 'pending'
  },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Submission schema: one per clipper-campaign join
const submissionSchema = new mongoose.Schema({
  clipper:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaign:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  joinedAt:   { type: Date, default: Date.now },   // when they clicked “Start”

  // history of all subsequent reports
  updates: [updateSchema]
}, { timestamps: true });

/**
 * Record a new view report.
 * @param {{proof_url:String, platform:String, views_reported:Number}} report
 */
submissionSchema.methods.addReport = function(report) {
  this.updates.push(report);
  return this.save();
};

/**
 * Approve the most-recent report.
 * @param {number} verifiedViews
 */
submissionSchema.methods.approveLast = function(verifiedViews) {
  const u = this.updates[this.updates.length - 1];
  u.verifiedViews = verifiedViews;
  u.status        = 'approved';
  return this.save();
};

/**
 * Reject the most-recent report.
 * @param {string} reason
 */
submissionSchema.methods.rejectLast = function(reason) {
  const u = this.updates[this.updates.length - 1];
  u.status          = 'rejected';
  u.rejectionReason = reason;
  return this.save();
};

export default mongoose.model('Submission', submissionSchema);