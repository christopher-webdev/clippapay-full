


// // File: express_backend/models/Submission.js
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
// File: express_backend/models/Submission.js
// inside submissionSchema.methods.approveProofViews (replace the money section)

submissionSchema.methods.approveProofViews = async function(proofId, newVerifiedViews, { Campaign, Transaction, Wallet, User }) {
  const proof = this.proofs.id(proofId);
  if (!proof) throw new Error('Proof not found');

  const deltaViews = Math.max(0, newVerifiedViews - (proof.verifiedViews || 0));
  if (deltaViews === 0) return this;

  const campaign = await Campaign.findById(this.campaign);
  if (!campaign) throw new Error('Campaign not found');

  const advertiserCpm = campaign.rate_per_1000;  // 5000 for UGC
  const clipperCpm    = campaign.clipper_cpm;    // 2000 for UGC
  const advertiserCost = (deltaViews * advertiserCpm) / 1000;
  const clipperPay     = (deltaViews * clipperCpm)    / 1000;
  const platformFee    = Math.max(0, advertiserCost - clipperPay); // 3000/k for UGC

  const advertiser = campaign.advertiser;
  const clipper    = this.clipper;

  const advWallet  = await Wallet.findOne({ user: advertiser });
  const clipWallet = await Wallet.findOne({ user: clipper });
  if (!advWallet) throw new Error('Advertiser wallet not found');
  if (!clipWallet) throw new Error('Clipper wallet not found');

  // Find platform account (create one per your setup)
  // Option A: env VAR
  // const platformUserId = process.env.PLATFORM_USER_ID;
  // const platformUser = await User.findById(platformUserId);

  // Option B: the first user with role 'platform'
  const platformUser = await User.findOne({ role: 'platform' });
  if (!platformUser) throw new Error('Platform user not found');
  const platformWallet = await Wallet.findOne({ user: platformUser._id });
  if (!platformWallet) throw new Error('Platform wallet not found');

  // Ensure escrow has the FULL advertiser cost (not just clipper share)
  if (advWallet.escrowLocked < advertiserCost) throw new Error('Insufficient escrow');

  // 1) Release escrow amount = advertiser total cost for these views
  await advWallet.releaseEscrow(advertiserCost);

  // 2) Split: credit clipper + credit platform
  await clipWallet.credit(clipperPay);
  if (platformFee > 0) await platformWallet.credit(platformFee);

  // 3) Transactions
  await Transaction.create({
    user: advertiser,
    type: 'debit',
    amount: advertiserCost,
    campaign: campaign._id,
    related_submission: this._id,
    note: `Charge for ${deltaViews} verified views @ ₦${advertiserCpm}/k (UGC)`,
    rateSnapshot: advertiserCpm,
    proofId: proof._id,
    campaignKind: campaign.kind
  });

  await Transaction.create({
    user: clipper,
    type: 'credit',
    amount: clipperPay,
    campaign: campaign._id,
    related_submission: this._id,
    note: `Earnings for ${deltaViews} verified views @ ₦${clipperCpm}/k (UGC)`,
    rateSnapshot: clipperCpm,
    proofId: proof._id,
    campaignKind: campaign.kind
  });

  if (platformFee > 0) {
    await Transaction.create({
      user: platformUser._id,
      type: 'credit',
      amount: platformFee,
      campaign: campaign._id,
      related_submission: this._id,
      note: `Platform fee for ${deltaViews} verified views (UGC)`,
      rateSnapshot: advertiserCpm - clipperCpm,
      proofId: proof._id,
      campaignKind: campaign.kind
    });
  }

  // 4) Update proof/submission/campaign counters
  proof.verifiedViews = newVerifiedViews;
  proof.lastVerified  = new Date();
  proof.status        = 'approved';
  proof.rewardAmount  = (proof.rewardAmount || 0) + clipperPay;

  this.rewardAmount   = (this.rewardAmount || 0) + clipperPay;

  // Deduct views & budget on campaign (uses rate_per_1000 i.e., 5000 for UGC)
  await campaign.deductViewsAndBudget(deltaViews);

  await campaign.save();
  await this.save();
  return this;
};

export default mongoose.model('Submission', submissionSchema);
// import mongoose from 'mongoose';

// // Sub‐document for each view report/update
// const updateSchema = new mongoose.Schema({
//   proof_url:      String,   // social post link
//   platform:       String,   // e.g. 'TikTok'
//   views_reported: { type: Number, required: true },
//   verifiedViews:  Number,   // set by admin or automated check
//   status: {
//     type: String,
//     enum: ['pending','approved','rejected'],
//     default: 'pending'
//   },
//   updatedAt: { type: Date, default: Date.now }
// }, { _id: false });

// // Submission schema: one per clipper-campaign join
// const submissionSchema = new mongoose.Schema({
//   clipper:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   campaign:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
//   joinedAt:   { type: Date, default: Date.now },   // when they clicked “Start”

//   // history of all subsequent reports
//   updates: [updateSchema]
// }, { timestamps: true });

// /**
//  * Record a new view report.
//  * @param {{proof_url:String, platform:String, views_reported:Number}} report
//  */
// submissionSchema.methods.addReport = function(report) {
//   this.updates.push(report);
//   return this.save();
// };

// /**
//  * Approve the most-recent report.
//  * @param {number} verifiedViews
//  */
// submissionSchema.methods.approveLast = function(verifiedViews) {
//   const u = this.updates[this.updates.length - 1];
//   u.verifiedViews = verifiedViews;
//   u.status        = 'approved';
//   return this.save();
// };

// /**
//  * Reject the most-recent report.
//  * @param {string} reason
//  */
// submissionSchema.methods.rejectLast = function(reason) {
//   const u = this.updates[this.updates.length - 1];
//   u.status          = 'rejected';
//   u.rejectionReason = reason;
//   return this.save();
// };

// export default mongoose.model('Submission', submissionSchema);