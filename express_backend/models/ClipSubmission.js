// // express_backend/models/ClipSubmission.js

// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// // Proof Schema WITH _id per proof
// const proofSchema = new Schema({
//   platform: { type: String }, // Optional for PGC
//   submissionUrl: { type: String }, // Optional for PGC
//   views: { type: Number, default: 0 },
//   proofVideo: { type: String },
//   proofImage: { type: String },
//   status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
//   adminNote: { type: String },
//   lastVerified: { type: Date },
//   verifiedViews: { type: Number }, // Highest view count approved so far
//   rewardAmount: { type: Number }, // Cumulative reward paid for this proof
//   fixedPayoutGiven: { type: Boolean, default: false },
// }, { timestamps: true });

// // ClipSubmission Schema
// const clipSubmissionSchema = new Schema({
//   campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
//   clipper: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   proofs: { type: [proofSchema], default: [] }, // Multiple proofs for ANY platform!
//   rewardAmount: { type: Number, default: 0 }, // Sum for all approved proofs
// }, { timestamps: true });

// // Custom validation for proofs based on campaign type
// clipSubmissionSchema.pre('validate', async function(next) {
//   try {
//     const campaign = await mongoose.model('Campaign').findById(this.campaign);
//     if (!campaign) {
//       return next(new Error('Campaign not found.'));
//     }
//     const isPgc = campaign.kind === 'pgc';

//     for (const proof of this.proofs) {
//       if (isPgc) {
//         // For PGC, require proofVideo
//         if (!proof.proofVideo) {
//           return next(new Error('Proof video is required for PGC campaigns.'));
//         }
//       } else {
//         // For non-PGC, require platform and submissionUrl
//         if (!proof.platform) {
//           return next(new Error('Platform is required for non-PGC campaigns.'));
//         }
//         if (!proof.submissionUrl) {
//           return next(new Error('Submission URL is required for non-PGC campaigns.'));
//         }
//       }
//     }
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// export default mongoose.model('ClipSubmission', clipSubmissionSchema);
// express_backend/models/ClipSubmission.js

import mongoose from 'mongoose';
const { Schema } = mongoose;

const proofSchema = new Schema({
  platform: { type: String },
  submissionUrl: { type: String, default: null },
  views: { type: Number, default: 0 },
  proofVideo: { type: String },
  proofImage: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String },
  lastVerified: { type: Date },
  
  verifiedViews: { type: Number }, // Highest view count approved so far
  rewardAmount: { type: Number }, // Cumulative reward paid for this proof
        
}, { timestamps: true });

const clipSubmissionSchema = new Schema({
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  clipper: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  proofs: { type: [proofSchema], default: [] },
  rewardAmount: { type: Number, default: 0 },
  firstPayoutGiven: { type: Boolean, default: false },
}, { timestamps: true });

// Your existing smart validation (WhatsApp rules) — keep it exactly as is
clipSubmissionSchema.pre('validate', async function (next) {
  try {
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

export default mongoose.model('ClipSubmission', clipSubmissionSchema);