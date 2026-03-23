// models/Application.js
//
// FLOW REDESIGN — "Reactivation on offer failure":
//
//  1. Advertiser selects a clipper → others stay PENDING (not rejected yet)
//  2. Clipper has 2 hours to accept.
//     a) Accepts → status: 'accepted', 48h to submit → normal flow
//     b) Declines or timer expires → status: 'declined'/'expired'
//        → escrow is UNLOCKED back to advertiser
//        → all other pending applicants are REACTIVATED (status stays 'pending')
//        → advertiser gets notification: "Clipper declined/didn't respond — pick another"
//  3. Advertiser can now select a different applicant.
//
//  KEY CHANGE: We no longer mass-reject others on select.
//              We mass-reject them only when the chosen clipper actually ACCEPTS.
//
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },
  clipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Bidding
  proposedRateNGN:  { type: Number, min: 0 },
  proposedRateUSDT: { type: Number, min: 0 },
  note:             { type: String, maxlength: 500 },

  // Flow state
  status: {
    type: String,
    enum: [
      'pending',             // applied — waiting for advertiser
      'selected',            // advertiser chose this one, awaiting clipper accept (2h window)
      'accepted',            // clipper accepted → 48h to submit
      'submitted',           // video delivered
      'revision_requested',  // advertiser asked for changes
      'approved',            // final approval — payment released
      'rejected',            // only set when another clipper is fully accepted
      'expired',             // 2h offer window elapsed without response
      'declined',            // clipper actively declined the offer
      'withdrawn',           // clipper withdrew their own application
      'disputed',
      'disputed_resolved',
    ],
    default: 'pending',
  },

  // Timestamps & deadlines
  selectedAt:         Date,
  offerExpiresAt:     Date,         // selectedAt + 2 hours
  acceptedAt:         Date,
  submissionDeadline: Date,         // acceptedAt + 48 hours
  declinedAt:         Date,
  rejectedAt:         Date,
  rejectedReason:     String,

  revisionCount: { type: Number, default: 0, max: 3 },
  lastFeedback:  String,

  // Delivery
  currentVideoUrl:      String,
  currentThumbnailUrl:  String,
  lastSubmittedAt:      Date,

  // Payment & escrow
  paymentCurrency: { type: String, enum: ['NGN', 'USDT'] },
  paymentAmount:   Number,
  escrowReleased:  { type: Boolean, default: false },

  disputeRaised: { type: Boolean, default: false },
  completedAt:   Date,
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
applicationSchema.index({ campaign: 1, status: 1 });
applicationSchema.index({ clipper: 1, status: 1 });
applicationSchema.index({ offerExpiresAt: 1 });

// ==================== BUSINESS METHODS ====================

// Advertiser selects this clipper.
// Does NOT reject others — they stay pending until this clipper accepts or offer fails.
applicationSchema.methods.select = async function (currency, amount) {
  if (this.status !== 'pending') throw new Error('Application already processed');

  this.status         = 'selected';
  this.selectedAt     = new Date();
  this.offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 hours
  this.paymentCurrency = currency;
  this.paymentAmount   = amount;

  return this.save();
};

// Clipper accepts the offer.
// NOW we reject all other pending applicants for this campaign.
applicationSchema.methods.acceptOffer = async function () {
  if (this.status !== 'selected') throw new Error('Not selected');
  if (new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    await this.save();
    throw new Error('Offer expired');
  }

  this.status             = 'accepted';
  this.acceptedAt         = new Date();
  this.submissionDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 hours
  await this.save();

  // NOW reject all other pending applicants — the job is taken
  await mongoose.model('Application').updateMany(
    {
      campaign:  this.campaign,
      _id:       { $ne: this._id },
      status:    'pending',
    },
    {
      $set: {
        status:         'rejected',
        rejectedAt:     new Date(),
        rejectedReason: 'Another creator was selected for this campaign',
      },
    }
  );

  return this;
};

// Clipper actively declines the offer.
// Escrow must be unlocked by the calling route BEFORE this is called.
applicationSchema.methods.declineOffer = async function () {
  if (this.status !== 'selected') throw new Error('Not selected');

  this.status     = 'declined';
  this.declinedAt = new Date();
  return this.save();
};

// Called by the cron/scheduler when offerExpiresAt has passed.
// Escrow unlock handled by caller.
applicationSchema.methods.markExpiredOffer = async function () {
  if (this.status === 'selected' && new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    return this.save();
  }
};

applicationSchema.methods.submitVideo = async function (videoUrl, thumbnailUrl) {
  if (!['accepted', 'revision_requested'].includes(this.status)) {
    throw new Error('Cannot submit at this stage');
  }
  if (new Date() > this.submissionDeadline) throw new Error('Submission deadline passed');

  this.currentVideoUrl      = videoUrl;
  this.currentThumbnailUrl  = thumbnailUrl;
  this.lastSubmittedAt      = new Date();
  this.status               = 'submitted';
  return this.save();
};

applicationSchema.methods.requestRevision = async function (feedback) {
  if (this.revisionCount >= 3) throw new Error('Maximum 3 revisions reached');
  if (this.status !== 'submitted') throw new Error('No video to revise');

  this.revisionCount += 1;
  this.status       = 'revision_requested';
  this.lastFeedback = feedback;
  return this.save();
};

applicationSchema.methods.approve = async function () {
  if (this.status !== 'submitted') throw new Error('Nothing to approve');

  this.status        = 'approved';
  this.completedAt   = new Date();
  this.escrowReleased = true;
  return this.save();
};

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);