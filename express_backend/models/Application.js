// models/Application.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const applicationSchema = new Schema({

  // ─────────────────────────────
  // CORE REFERENCES
  // ─────────────────────────────
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  clipper: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  advertiser: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // ─────────────────────────────
  // STATUS MACHINE
  // ─────────────────────────────
  status: {
    type: String,
    enum: [
      'pending',
      'shortlisted',
      'offer_sent',
      'accepted',
      'rejected',
      'expired',
      'working',
      'submitted',
      'revision_requested',
      'approved',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },

  // ─────────────────────────────
  // OFFER TIMERS
  // ─────────────────────────────
  offerSentAt: Date,
  offerExpiresAt: Date,
  acceptedAt: Date,

  // ─────────────────────────────
  // SCRIPT DEVELOPMENT
  // ─────────────────────────────
  creatorScript: { type: String, default: '' },

  scriptStatus: {
    type: String,
    enum: ['not_required','pending_review','changes_requested','approved'],
    default: 'not_required'
  },

  scriptSubmittedAt: Date,
  scriptApprovedAt: Date,
  scriptExpiresAt: Date, // 2-hour window

  scriptRevisions: [{
    submittedAt: Date,
    content: String,
    feedback: String,
    status: { type: String, enum: ['pending_review','changes_requested','approved'] }
  }],

  // ─────────────────────────────
  // CONTENT SUBMISSION
  // ─────────────────────────────
  submissionVideo: String,
  submissionFiles: [String],
  submittedAt: Date,
  submissionDeadline: Date,

  // Posting URLs
  postUrls: {
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },

  // Screenshots (WhatsApp proof etc.)
  postScreenshots: [{
    platform: { type: String, enum: ['whatsapp','instagram','tiktok'] },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Revision tracking (VIDEO only — max 3)
  revisions: [{
    requestedAt: Date,
    notes: String,
    respondedAt: Date,
    responseNotes: String
  }],

  revisionCount: { type: Number, default: 0 },
  maxRevisions: { type: Number, default: 3 },

  // ─────────────────────────────
  // PAYMENT TRACKING
  // ─────────────────────────────
  payoutAmount: Number,
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  paidAt: Date,

  // ─────────────────────────────
  // REVIEW & RATING
  // ─────────────────────────────
  rating: { type: Number, min: 1, max: 5 },
  review: String,

}, { timestamps: true });


// ─────────────────────────────
// INDEXES
// ─────────────────────────────
applicationSchema.index({ campaign: 1, status: 1 });
applicationSchema.index({ clipper: 1, status: 1 });
applicationSchema.index({ offerExpiresAt: 1 });


// ─────────────────────────────
// OFFER METHODS
// ─────────────────────────────
applicationSchema.methods.sendOffer = function () {
  this.status = 'offer_sent';
  this.offerSentAt = new Date();
  this.offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  return this.save();
};

applicationSchema.methods.acceptOffer = async function () {
  if (this.status !== 'offer_sent') {
    throw new Error('No active offer to accept');
  }

  if (new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    await this.save();
    throw new Error('Offer expired');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();

  const campaign = await mongoose.model('Campaign').findById(this.campaign);

  // If script add-on selected
  if (campaign.kind === 'pgc' && campaign.pgcAddons.includes('script')) {
    this.scriptStatus = 'pending_review';
    this.scriptExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  } else {
    this.scriptStatus = 'not_required';
    this.status = 'working';
    this.submissionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  }

  return this.save();
};

applicationSchema.methods.rejectOffer = function () {
  this.status = 'rejected';
  return this.save();
};


// ─────────────────────────────
// SCRIPT METHODS
// ─────────────────────────────
applicationSchema.methods.submitScript = function (content) {
  if (this.scriptStatus === 'approved') {
    throw new Error('Script already approved');
  }

  if (this.scriptExpiresAt && new Date() > this.scriptExpiresAt) {
    this.status = 'expired';
    throw new Error('Script submission window expired');
  }

  this.creatorScript = content;
  this.scriptSubmittedAt = new Date();
  this.scriptStatus = 'pending_review';

  this.scriptRevisions.push({
    submittedAt: new Date(),
    content,
    status: 'pending_review'
  });

  return this.save();
};

applicationSchema.methods.requestScriptChanges = function (feedback) {
  if (this.scriptStatus !== 'pending_review') {
    throw new Error('No script to review');
  }

  this.scriptStatus = 'changes_requested';
  this.scriptExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const last = this.scriptRevisions[this.scriptRevisions.length - 1];
  if (last) {
    last.feedback = feedback;
    last.status = 'changes_requested';
  }

  return this.save();
};

applicationSchema.methods.approveScript = function () {
  if (this.scriptStatus !== 'pending_review') {
    throw new Error('No script pending approval');
  }

  this.scriptStatus = 'approved';
  this.scriptApprovedAt = new Date();
  this.status = 'working';
  this.submissionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const last = this.scriptRevisions[this.scriptRevisions.length - 1];
  if (last) last.status = 'approved';

  return this.save();
};


// ─────────────────────────────
// VIDEO SUBMISSION
// ─────────────────────────────
applicationSchema.methods.submitVideo = function (videoPath, postData = {}) {
  if (!['working','revision_requested'].includes(this.status)) {
    throw new Error('Not allowed to submit');
  }

  if (new Date() > this.submissionDeadline) {
    this.status = 'expired';
    throw new Error('Submission deadline expired');
  }

  this.submissionVideo = videoPath;
  this.submittedAt = new Date();
  this.status = 'submitted';

  if (postData.postUrls) {
    this.postUrls = { ...this.postUrls, ...postData.postUrls };
  }

  if (postData.screenshots?.length) {
    this.postScreenshots.push(...postData.screenshots);
  }

  return this.save();
};


// ─────────────────────────────
// REVISION REQUEST
// ─────────────────────────────
applicationSchema.methods.requestRevision = function (notes) {
  if (this.revisionCount >= this.maxRevisions) {
    throw new Error('Maximum revisions reached');
  }

  if (this.status !== 'submitted') {
    throw new Error('No submission to revise');
  }

  this.revisions.push({
    requestedAt: new Date(),
    notes
  });

  this.revisionCount += 1;
  this.status = 'revision_requested';

  return this.save();
};


// ─────────────────────────────
// POSTING VALIDATION (PGC)
// ─────────────────────────────
applicationSchema.methods.validatePostingRequirements = async function () {
  const campaign = await mongoose.model('Campaign').findById(this.campaign);

  if (!campaign.postingRequirements) return true;

  const reqs = campaign.postingRequirements;

  if (reqs.instagram && !this.postUrls.instagram) {
    throw new Error('Instagram URL required');
  }

  if (reqs.tiktok && !this.postUrls.tiktok) {
    throw new Error('TikTok URL required');
  }

  if (reqs.whatsapp) {
    const hasScreenshot = this.postScreenshots.some(s => s.platform === 'whatsapp');
    if (!hasScreenshot) {
      throw new Error('WhatsApp screenshot required');
    }
  }

  return true;
};


// ─────────────────────────────
// FINAL APPROVAL + PAYMENT
// ─────────────────────────────
applicationSchema.methods.approveAndPay = async function () {
  if (!['submitted','revision_requested'].includes(this.status)) {
    throw new Error('No submission to approve');
  }

  await this.validatePostingRequirements();

  const Campaign = mongoose.model('Campaign');
  const Wallet = mongoose.model('Wallet');
  const Transaction = mongoose.model('Transaction');
  const User = mongoose.model('User');

  const campaign = await Campaign.findById(this.campaign);
  const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser });
  const clipperWallet = await Wallet.findOne({ user: this.clipper });
  const platformUser = await User.findOne({ role: 'platform' });
  const platformWallet = await Wallet.findOne({ user: platformUser._id });

  const payout = campaign.clipper_cpm;
  const totalCost = campaign.rate_per_1000;
  const platformFee = totalCost - payout;

  if (advertiserWallet.escrowLocked < totalCost) {
    throw new Error('Insufficient escrow');
  }

  // Release escrow
  await advertiserWallet.releaseEscrow(totalCost);

  // Split
  await clipperWallet.credit(payout);
  if (platformFee > 0) await platformWallet.credit(platformFee);

  // Campaign accounting
  await campaign.approveVideo(1);

  const tx = await Transaction.create({
    user: this.clipper,
    type: 'credit',
    amount: payout,
    campaign: campaign._id,
    description: `PGC payment for ${campaign.title}`
  });

  this.status = 'completed';
  this.paidAt = new Date();
  this.transactionId = tx._id;
  this.payoutAmount = payout;

  return this.save();
};

export default mongoose.model('Application', applicationSchema);
