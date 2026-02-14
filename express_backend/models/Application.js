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
  offerSentAt: Date,
  offerExpiresAt: Date,
  acceptedAt: Date,
  submissionDeadline: Date,
  submittedAt: Date,
  approvedAt: Date,

  // Content tracking
  submissionVideo: String,           // Path to uploaded video
  submissionFiles: [String],          // Additional files
  
  // NEW: Post URLs for different platforms (from add-ons)
  postUrls: {
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    whatsapp: { type: String, default: '' }, // For WhatsApp, this could be a placeholder or chat link
    other: { type: String, default: '' }
  },
  
  // NEW: Screenshots for platforms that require them (especially WhatsApp)
  postScreenshots: [{
    platform: { type: String, enum: ['whatsapp', 'instagram', 'tiktok', 'other'] },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // NEW: Track which posting requirements have been fulfilled
  postingFulfilled: {
    whatsapp: { type: Boolean, default: false },
    instagram: { type: Boolean, default: false },
    tiktok: { type: Boolean, default: false },
    script: { type: Boolean, default: false } // For script add-on
  },

  // NEW: Script provided by creator (if script add-on selected)
  creatorScript: { type: String, default: '' },

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
  payoutAmount: Number,
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
  notes: String,
  rating: { type: Number, min: 1, max: 5 },
  review: String,

}, { timestamps: true });

// Indexes for performance
applicationSchema.index({ campaign: 1, status: 1 });
applicationSchema.index({ clipper: 1, status: 1 });
applicationSchema.index({ offerExpiresAt: 1 }, { expireAfterSeconds: 0 });

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

// NEW: Submit video with post URLs and screenshots
applicationSchema.methods.submitVideo = function(videoPath, postData = {}) {
  if (this.status !== 'accepted' && this.status !== 'revision_requested') {
    throw new Error('Cannot submit: Not in working state');
  }
  
  this.status = 'submitted';
  this.submissionVideo = videoPath;
  this.submittedAt = new Date();
  
  // Update post URLs if provided
  if (postData.postUrls) {
    this.postUrls = { ...this.postUrls, ...postData.postUrls };
  }
  
  // Add screenshots if provided
  if (postData.screenshots && postData.screenshots.length) {
    this.postScreenshots = [...(this.postScreenshots || []), ...postData.screenshots];
  }
  
  // Update posting fulfillment based on campaign requirements
  if (this.campaign) {
    const campaign = this.campaign;
    if (campaign.postingRequirements) {
      if (campaign.postingRequirements.whatsapp && this.postScreenshots?.some(s => s.platform === 'whatsapp')) {
        this.postingFulfilled.whatsapp = true;
      }
      if (campaign.postingRequirements.instagram && this.postUrls?.instagram) {
        this.postingFulfilled.instagram = true;
      }
      if (campaign.postingRequirements.tiktok && this.postUrls?.tiktok) {
        this.postingFulfilled.tiktok = true;
      }
    }
  }
  
  return this.save();
};

// NEW: Add creator script
applicationSchema.methods.addCreatorScript = function(script) {
  this.creatorScript = script;
  this.postingFulfilled.script = true;
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

// NEW: Check if all posting requirements are fulfilled
applicationSchema.methods.checkPostingRequirements = function() {
  if (!this.campaign) return true;
  
  const campaign = this.campaign;
  const requirements = campaign.postingRequirements || {};
  const fulfilled = this.postingFulfilled || {};
  
  if (requirements.whatsapp && !fulfilled.whatsapp) {
    throw new Error('WhatsApp posting proof (screenshot) is required');
  }
  if (requirements.instagram && !fulfilled.instagram) {
    throw new Error('Instagram post URL is required');
  }
  if (requirements.tiktok && !fulfilled.tiktok) {
    throw new Error('TikTok post URL is required');
  }
  
  return true;
};

applicationSchema.methods.approve = async function() {
  if (this.status !== 'submitted' && this.status !== 'revision_requested') {
    throw new Error('Cannot approve: No submission to approve');
  }
  
  // Check if all posting requirements are met
  this.checkPostingRequirements();
  
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
  const campaign = await mongoose.model('Campaign').findById(this.campaign);
  if (!campaign) throw new Error('Campaign not found');
  
  const payoutAmount = campaign.clipper_cpm;
  
  const clipperWallet = await mongoose.model('Wallet').findOne({ user: this.clipper });
  if (!clipperWallet) throw new Error('Clipper wallet not found');
  
  const transaction = await mongoose.model('Transaction').create({
    user: this.clipper,
    type: 'credit',
    amount: payoutAmount,
    description: `Payment for ${campaign.title}`,
    status: 'completed',
    reference: `APP_${this._id}_${Date.now()}`
  });
  
  clipperWallet.balance += payoutAmount;
  await clipperWallet.save();
  
  return { success: true, transactionId: transaction._id };
};

// Helper method to get posting instructions
applicationSchema.methods.getPendingPostingRequirements = function() {
  if (!this.campaign) return [];
  
  const campaign = this.campaign;
  const requirements = campaign.postingRequirements || {};
  const fulfilled = this.postingFulfilled || {};
  const pending = [];
  
  if (requirements.whatsapp && !fulfilled.whatsapp) {
    pending.push({
      platform: 'whatsapp',
      type: 'screenshot',
      instruction: 'Upload a screenshot of your WhatsApp post'
    });
  }
  if (requirements.instagram && !fulfilled.instagram) {
    pending.push({
      platform: 'instagram',
      type: 'url',
      instruction: 'Provide the URL of your Instagram post'
    });
  }
  if (requirements.tiktok && !fulfilled.tiktok) {
    pending.push({
      platform: 'tiktok',
      type: 'url',
      instruction: 'Provide the URL of your TikTok video'
    });
  }
  if (campaign.pgcAddons?.includes('script') && !fulfilled.script) {
    pending.push({
      platform: 'script',
      type: 'text',
      instruction: 'Write the script for your video'
    });
  }
  
  return pending;
};

export default mongoose.model('Application', applicationSchema);