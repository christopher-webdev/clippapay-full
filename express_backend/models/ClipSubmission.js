// models/ClipSubmission.js
// Fixed: pre-validate hook now correctly handles BOTH Campaign and ClippingCampaign refs.
// The root cause of "Could not join campaign" was that when a clipper joined a
// ClippingCampaign, the hook tried to validate via mongoose.model('Campaign') which
// doesn't find a ClippingCampaign document → throws "Campaign not found" → 500 error.

import mongoose from 'mongoose';
const { Schema } = mongoose;

const proofSchema = new Schema({
  platform:       { type: String },
  submissionUrl:  { type: String, default: null },
  views:          { type: Number, default: 0 },
  proofVideo:     { type: String },
  proofImage:     { type: String },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:      { type: String },
  lastVerified:   { type: Date },
  verifiedViews:  { type: Number, default: 0 }, // Highest view count approved so far
  rewardAmount:   { type: Number, default: 0 }, // Cumulative reward paid for this proof
}, { timestamps: true });

const clipSubmissionSchema = new Schema({
  // campaignType distinguishes which collection the campaign ID points to.
  // 'Campaign' = UGC/PGC old campaigns; 'ClippingCampaign' = new clipping campaigns
  campaign:      { type: Schema.Types.ObjectId, required: true, refPath: 'campaignType' },
  campaignType:  { type: String, enum: ['Campaign', 'ClippingCampaign'], default: 'Campaign' },
  clipper:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  proofs:        { type: [proofSchema], default: [] },
  rewardAmount:  { type: Number, default: 0 },
  firstPayoutGiven: { type: Boolean, default: false },
}, { timestamps: true });

// Smart pre-validate: only validate proof rules for UGC/PGC Campaign docs.
// ClippingCampaign proofs follow different rules enforced at the route level.
clipSubmissionSchema.pre('validate', async function (next) {
  try {
    // If this is a clipping campaign submission, skip the old proof validation
    if (this.campaignType === 'ClippingCampaign') {
      return next();
    }

    // Legacy UGC/PGC validation
    const campaign = await mongoose.model('Campaign').findById(this.campaign);
    if (!campaign) return next(new Error('Campaign not found.'));

    const isPgc = campaign.kind === 'pgc';

    for (const proof of this.proofs) {
      if (isPgc) {
        if (!proof.proofVideo) {
          return next(new Error('Proof video is required for PGC campaigns.'));
        }
        continue;
      }

      if (!proof.platform) {
        return next(new Error('Platform is required for non-PGC campaigns.'));
      }

      const platformLower = proof.platform.toLowerCase();
      if (platformLower === 'whatsapp') {
        if (proof.submissionUrl) {
          return next(new Error('WhatsApp submissions cannot have a link.'));
        }
        if (!proof.proofVideo && !proof.proofImage) {
          return next(new Error('WhatsApp requires at least one image or video proof.'));
        }
      } else {
        if (!proof.submissionUrl || proof.submissionUrl.trim() === '') {
          return next(new Error('Submission URL is required for this platform.'));
        }
        if (!/^https:\/\//i.test(proof.submissionUrl.trim())) {
          return next(new Error('Submission URL must start with https://'));
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.models.ClipSubmission || mongoose.model('ClipSubmission', clipSubmissionSchema);
