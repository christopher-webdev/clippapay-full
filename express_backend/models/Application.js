// models/Application.js
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  clipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Bidding
  proposedRateNGN: { type: Number, min: 0 },
  proposedRateUSDT: { type: Number, min: 0 },
  note: { type: String, maxlength: 500 },

  // Flow state
  status: {
    type: String,
    enum: [
      'pending',          // applied
      'selected',         // advertiser chose this one
      'accepted',         // clipper accepted within 2h
      'submitted',        // video delivered
      'revision_requested', // advertiser asked for changes
      'approved',         // final approval
      'rejected',         // advertiser or auto
      'expired',          // 2h offer expired
      'withdrawn',         // clipper withdrew
      'disputed', 
      'disputed_resolved'
    ],
    default: 'pending'
  },

  // Timestamps & deadlines
  selectedAt: Date,
  offerExpiresAt: Date,        // selectedAt + 2 hours
  acceptedAt: Date,
  submissionDeadline: Date,     // acceptedAt + 48 hours

  revisionCount: { type: Number, default: 0, max: 3 },
  lastFeedback: String,

  // Delivery
  currentVideoUrl: String,
  currentThumbnailUrl: String,
  lastSubmittedAt: Date,

  // Payment & escrow tracking
  paymentCurrency: { type: String, enum: ['NGN', 'USDT'] },
  paymentAmount: Number,        // exact amount that was escrowed
  escrowReleased: { type: Boolean, default: false },

  disputeRaised: { type: Boolean, default: false },
  completedAt: Date
}, { timestamps: true });

// Compound indexes
applicationSchema.index({ campaign: 1, status: 1 });
applicationSchema.index({ clipper: 1, status: 1 });
applicationSchema.index({ offerExpiresAt: 1 });

// ==================== BUSINESS METHODS ====================

applicationSchema.methods.select = async function (currency, amount) {
  if (this.status !== 'pending') throw new Error('Application already processed');
  
  this.status = 'selected';
  this.selectedAt = new Date();
  this.offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  this.paymentCurrency = currency;
  this.paymentAmount = amount;

  return this.save();
};

applicationSchema.methods.acceptOffer = async function () {
  if (this.status !== 'selected') throw new Error('Not selected');
  if (new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    throw new Error('Offer expired');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.submissionDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
  return this.save();
};

applicationSchema.methods.submitVideo = async function (videoUrl, thumbnailUrl) {
  if (this.status !== 'accepted' && this.status !== 'revision_requested') {
    throw new Error('Cannot submit at this stage');
  }
  if (new Date() > this.submissionDeadline) throw new Error('Submission deadline passed');

  this.currentVideoUrl = videoUrl;
  this.currentThumbnailUrl = thumbnailUrl;
  this.lastSubmittedAt = new Date();
  this.status = 'submitted';
  return this.save();
};

applicationSchema.methods.requestRevision = async function (feedback) {
  if (this.revisionCount >= 3) throw new Error('Maximum 3 revisions reached');
  if (this.status !== 'submitted') throw new Error('No video to revise');

  this.revisionCount += 1;
  this.status = 'revision_requested';
  this.lastFeedback = feedback;
  return this.save();
};

applicationSchema.methods.approve = async function () {
  if (this.status !== 'submitted') throw new Error('Nothing to approve');
  
  this.status = 'approved';
  this.completedAt = new Date();
  this.escrowReleased = true; // flag only — actual wallet credit in route/service
  return this.save();
};

applicationSchema.methods.markExpired = async function () {
  if (this.status === 'selected' && new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    return this.save();
  }
};

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);