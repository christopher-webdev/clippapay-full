

import mongoose from 'mongoose';
const { Schema } = mongoose;

// Proof Schema WITH _id per proof
const proofSchema = new Schema({
  platform:    { type: String, required: true }, // TikTok, Instagram, etc.
  submissionUrl: { type: String, required: true },
  views: { type: Number, default: 0 },
  proofVideo: { type: String },
  proofImage: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String },
  lastVerified: { type: Date },
  verifiedViews: { type: Number },// Highest view count approved so far
  rewardAmount: { type: Number }, // Cumulative reward paid for this proof
}, { timestamps: true }); // <-- timestamps for each proof

const clipSubmissionSchema = new Schema({
  campaign:  { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  clipper:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  proofs:    { type: [proofSchema], default: [] }, // Multiple proofs for ANY platform!
  rewardAmount: { type: Number, default: 0 }, // Sum for all approved proofs
}, { timestamps: true });

export default mongoose.model('ClipSubmission', clipSubmissionSchema);
