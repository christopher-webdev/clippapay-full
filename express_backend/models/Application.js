// models/Application.js
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  // Core references
  campaign: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true 
  },
  clipper: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  advertiser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Application status tracking
  status: {
    type: String,
    enum: [
      'pending',           // Initially applied
      'shortlisted',       // Advertiser wants to work with them
      'offer_sent',        // Job offer sent to clipper
      'accepted',          // Clipper accepted the job
      'rejected',          // Clipper rejected the offer
      'expired',           // Offer expired (2hrs)
      'working',           // Actively creating content
      'submitted',         // Video submitted
      'revision_requested', // Advertiser asked for changes
      'approved',          // Advertiser approved (payout sent)
      'completed',         // Final state
      'cancelled'          // Cancelled by either party
    ],
    default: 'pending'
  },

  // Timestamps for time-sensitive actions
  offerSentAt: Date,           // When advertiser sent offer
  offerExpiresAt: Date,        // 2 hours after offer_sent
  acceptedAt: Date,            // When clipper accepted
  submissionDeadline: Date,    // 3 days after acceptance
  submittedAt: Date,           // When clipper submitted video
  approvedAt: Date,            // When advertiser approved

  // Content tracking
  submissionUrl: String,
  submissionVideo: String,     // Path to uploaded video
  submissionFiles: [String],   // Additional files if needed

  // Revision tracking (3 max)
  revisions: [{
    requestedAt: Date,
    notes: String,
    files: [String],
    respondedAt: Date,
    responseNotes: String,
    responseFiles: [String]
  }],
  revisionCount: { type: Number, default: 0 },
  maxRevisions: { type: Number, default: 3 },

  // Payment tracking
  payoutAmount: Number,        // From campaign.clipper_cpm
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  paidAt: Date,

  // Messages/comments
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    files: [String],
    createdAt: { type: Date, default: Date.now }
  }],

  // Metadata
  notes: String,               // Advertiser notes about the clipper
  rating: { type: Number, min: 1, max: 5 }, // Final rating
  review: String,              // Review after completion

}, { timestamps: true });

// Indexes for performance
applicationSchema.index({ campaign: 1, status: 1 });
applicationSchema.index({ clipper: 1, status: 1 });
applicationSchema.index({ offerExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for cleanup

// Methods
applicationSchema.methods.sendOffer = function() {
  this.status = 'offer_sent';
  this.offerSentAt = new Date();
  this.offerExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  return this.save();
};

applicationSchema.methods.acceptOffer = function() {
  if (this.status !== 'offer_sent') {
    throw new Error('Cannot accept: No active offer');
  }
  if (new Date() > this.offerExpiresAt) {
    this.status = 'expired';
    throw new Error('Offer has expired');
  }
  
  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.submissionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
  return this.save();
};

applicationSchema.methods.rejectOffer = function() {
  if (this.status !== 'offer_sent') return;
  this.status = 'rejected';
  return this.save();
};

applicationSchema.methods.submitVideo = function(url, files = []) {
  if (this.status !== 'accepted' && this.status !== 'revision_requested') {
    throw new Error('Cannot submit: Not in working state');
  }
  
  this.status = 'submitted';
  this.submissionUrl = url;
  if (files.length) this.submissionFiles = files;
  this.submittedAt = new Date();
  return this.save();
};

applicationSchema.methods.requestRevision = function(notes, files = []) {
  if (this.revisionCount >= this.maxRevisions) {
    throw new Error('Maximum revisions reached');
  }
  if (this.status !== 'submitted') {
    throw new Error('Cannot request revision: No submission to review');
  }
  
  this.revisions.push({
    requestedAt: new Date(),
    notes,
    files
  });
  this.revisionCount += 1;
  this.status = 'revision_requested';
  return this.save();
};

applicationSchema.methods.approve = async function() {
  if (this.status !== 'submitted' && this.status !== 'revision_requested') {
    throw new Error('Cannot approve: No submission to approve');
  }
  
  this.status = 'approved';
  this.approvedAt = new Date();
  
  // Trigger payment
  const result = await this.processPayment();
  if (result.success) {
    this.status = 'completed';
    this.paidAt = new Date();
    this.transactionId = result.transactionId;
  }
  
  return this.save();
};

applicationSchema.methods.processPayment = async function() {
  // Get campaign to know payout amount
  const campaign = await mongoose.model('Campaign').findById(this.campaign);
  if (!campaign) throw new Error('Campaign not found');
  
  const payoutAmount = campaign.clipper_cpm; // Already stored as total payout
  
  // Find wallets
  const platformWallet = await mongoose.model('Wallet').findOne({ user: process.env.PLATFORM_USER_ID });
  const clipperWallet = await mongoose.model('Wallet').findOne({ user: this.clipper });
  
  if (!clipperWallet) throw new Error('Clipper wallet not found');
  
  // Create transaction
  const transaction = await mongoose.model('Transaction').create({
    user: this.clipper,
    type: 'credit',
    amount: payoutAmount,
    description: `Payment for ${campaign.title}`,
    status: 'completed',
    reference: `APP_${this._id}_${Date.now()}`
  });
  
  // Credit clipper
  clipperWallet.balance += payoutAmount;
  await clipperWallet.save();
  
  // Note: Platform fee already deducted at campaign creation
  // So full clipper_cpm goes to clipper
  
  return { success: true, transactionId: transaction._id };
};

export default mongoose.model('Application', applicationSchema);