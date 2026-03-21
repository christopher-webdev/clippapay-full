// models/Campaign.js
// KEY CHANGES vs previous version:
//  - Status lifecycle: draft → pending_approval (new) → active → video_submitted / revision_requested → completed/cancelled
//  - UGC campaigns default to 'pending_approval' (adworker reviews before going live)
//  - Added adworkerNote field for adworker rejection/approval notes
//  - Adworker "Go Live" endpoint moves pending_approval → active
//  - Payment flow: advertiser clicks "Mark Complete" OR deadline expires → auto-pays clipper
//  - paymentReleased flag on campaign so double-pay is impossible
import mongoose from 'mongoose';

const creativeDirectionSchema = new mongoose.Schema({
  aspectRatio:         { type: String, enum: ['9:16','16:9','1:1','4:5','any'], default: '9:16' },
  preferredLocation:   { type: String, enum: ['indoor','outdoor','studio','anywhere','specific'], default: 'anywhere' },
  locationDescription: { type: String, maxlength: 300, trim: true },
  backgroundStyle:     { type: String, maxlength: 200, trim: true },
  moodTone:            { type: String, maxlength: 150, trim: true },
  referenceLinks:      [String],
}, { _id: false });

const videoSubmissionSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  clipperId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl:      { type: String, required: true },
  thumbnailUrl:  String,
  submissionDate:{ type: Date, default: Date.now },
  status:        { type: String, enum: ['pending_review','approved','revision_requested'], default: 'pending_review' },
  revisionCount: { type: Number, default: 0 },
  feedback: [{
    message: String, createdAt: Date,
    fromAdvertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  approvedAt: Date,
  finalVideoUrl: String,
}, { _id: true });

const campaignSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, maxlength: 2000 },
  script:      { type: String, maxlength: 6000 },
  keyPhrases:  [{ type: String, trim: true, maxlength: 120 }],
  preferredLength: { type: String, enum: ['15s','30s','45s','60s','90s','any'], default: '30s' },
  category:    { type: String, required: true, index: true },
  creativeDirection: { type: creativeDirectionSchema, default: () => ({}) },
  thumbnailUrl:{ type: String, default: null },
  referenceFiles: [String],
  applicationDeadline: { type: Date, required: true },
  videoSubmissions:   [videoSubmissionSchema],
  currentSubmission:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  selectedClipper:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  finalVideo: {
    url: String, thumbnailUrl: String, approvedAt: Date,
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' }
  },

  // ── Status lifecycle ──────────────────────────────────────────────────────
  // pending_approval = waiting for adworker to review & approve (NEW DEFAULT)
  // active           = adworker approved, visible to clippers
  // closed           = deadline passed, no more applications
  // video_submitted  = clipper submitted their video
  // revision_requested = advertiser asked for changes
  // completed        = advertiser accepted OR auto-completed after deadline
  // cancelled        = cancelled before completion
  status: {
    type: String,
    enum: ['draft','pending_approval','active','closed','video_submitted','revision_requested','completed','cancelled'],
    default: 'pending_approval',
    index: true
  },

  // Adworker review
  adworkerNote: { type: String, maxlength: 1000 },
  approvedByAdworker: { type: Boolean, default: false },
  approvedAt: Date,

  // Payment protection — once true, no second payment will be made
  paymentReleased: { type: Boolean, default: false },

  createdAt:     { type: Date, default: Date.now, index: true },
  updatedAt:     { type: Date, default: Date.now },
  closedAt:      Date,
  completedAt:   Date,
  cancelledAt:   Date,
  cancelledReason: String,
}, { timestamps: true });

campaignSchema.index({ advertiser: 1, status: 1, createdAt: -1 });
campaignSchema.index({ category: 1, status: 1, applicationDeadline: 1 });
campaignSchema.index({ applicationDeadline: 1 });

// ── Methods ───────────────────────────────────────────────────────────────────

// Adworker approves → goes live
campaignSchema.methods.goLive = async function (adworkerNote = '') {
  if (this.status !== 'pending_approval') {
    throw new Error(`Cannot go live from status: ${this.status}`);
  }
  if (this.applicationDeadline <= new Date()) {
    throw new Error('Application deadline has already passed');
  }
  this.status = 'active';
  this.approvedByAdworker = true;
  this.approvedAt = new Date();
  if (adworkerNote) this.adworkerNote = adworkerNote;
  return this.save();
};

// Adworker rejects (sends back with note)
campaignSchema.methods.rejectByAdworker = async function (note) {
  if (this.status !== 'pending_approval') {
    throw new Error(`Cannot reject from status: ${this.status}`);
  }
  this.status = 'draft'; // back to draft so advertiser can edit + resubmit
  this.adworkerNote = note || 'Please review the feedback and resubmit.';
  this.approvedByAdworker = false;
  return this.save();
};

// Advertiser submits for adworker review (draft → pending_approval)
campaignSchema.methods.submitForReview = async function () {
  if (!['draft'].includes(this.status)) {
    throw new Error(`Campaign must be in draft to submit for review`);
  }
  this.status = 'pending_approval';
  this.adworkerNote = '';
  return this.save();
};

campaignSchema.methods.close = async function (reason = '') {
  if (this.status !== 'active') throw new Error(`Cannot close campaign in status: ${this.status}`);
  this.status = 'closed';
  this.closedAt = new Date();
  if (reason) this.cancelledReason = reason;
  return this.save();
};

campaignSchema.methods.markCompleted = async function () {
  const valid = ['active','closed','video_submitted','revision_requested','revision_submitted'];
  if (!valid.includes(this.status)) {
    throw new Error(`Cannot mark as completed from status: ${this.status}`);
  }
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

campaignSchema.methods.cancel = async function (reason) {
  if (['completed','cancelled'].includes(this.status)) {
    throw new Error(`Cannot cancel campaign in status: ${this.status}`);
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledReason = reason || 'Cancelled by advertiser/admin';
  return this.save();
};

campaignSchema.methods.addVideoSubmission = async function (applicationId, clipperId, videoUrl, thumbnailUrl) {
  this.videoSubmissions.push({
    applicationId, clipperId, videoUrl, thumbnailUrl,
    submissionDate: new Date(), status: 'pending_review'
  });
  if (['active','closed'].includes(this.status)) this.status = 'video_submitted';
  else if (this.status === 'revision_requested') this.status = 'revision_submitted';
  this.currentSubmission = applicationId;
  this.selectedClipper = clipperId;
  return this.save();
};

campaignSchema.methods.requestRevision = async function (submissionId, feedback, advertiserId) {
  const submission = this.videoSubmissions.id(submissionId);
  if (!submission) throw new Error('Submission not found');
  submission.status = 'revision_requested';
  submission.revisionCount += 1;
  submission.feedback.push({ message: feedback, createdAt: new Date(), fromAdvertiser: advertiserId });
  this.status = 'revision_requested';
  return this.save();
};

campaignSchema.methods.approveVideo = async function (submissionId, finalVideoUrl) {
  const submission = this.videoSubmissions.id(submissionId);
  if (!submission) throw new Error('Submission not found');
  submission.status = 'approved';
  submission.approvedAt = new Date();
  this.finalVideo = {
    url: finalVideoUrl || submission.videoUrl,
    thumbnailUrl: submission.thumbnailUrl,
    approvedAt: new Date(),
    applicationId: submission.applicationId
  };
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

campaignSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  // Auto-close if deadline passed and still active
  if (this.status === 'active' && this.applicationDeadline < new Date()) {
    this.status = 'closed';
    this.closedAt = new Date();
  }
  next();
});

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
