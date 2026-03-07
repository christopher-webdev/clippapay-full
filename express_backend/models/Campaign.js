// models/Campaign.js (updated)
import mongoose from 'mongoose';

const creativeDirectionSchema = new mongoose.Schema({
  aspectRatio: {
    type: String,
    enum: ['9:16', '16:9', '1:1', '4:5', 'any'],
    default: '9:16'
  },
  preferredLocation: {
    type: String,
    enum: ['indoor', 'outdoor', 'studio', 'anywhere', 'specific'],
    default: 'anywhere'
  },
  locationDescription: {
    type: String,
    maxlength: 300,
    trim: true
  },
  backgroundStyle: {
    type: String,
    maxlength: 200,
    trim: true
  },
  moodTone: {
    type: String,
    maxlength: 150,
    trim: true
  },
  referenceLinks: [String],
}, { _id: false });

// Add video submission tracking schema
const videoSubmissionSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  clipperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  submissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'revision_requested'],
    default: 'pending_review'
  },
  revisionCount: {
    type: Number,
    default: 0
  },
  feedback: [{
    message: String,
    createdAt: Date,
    fromAdvertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  approvedAt: Date,
  finalVideoUrl: String // For final approved version
}, { _id: true });

const campaignSchema = new mongoose.Schema({
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },

  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  script: {
    type: String,
    maxlength: 6000
  },

  keyPhrases: [{
    type: String,
    trim: true,
    maxlength: 120
  }],

  preferredLength: {
    type: String,
    enum: ['15s', '30s', '45s', '60s', '90s', 'any'],
    default: '30s'
  },

  category: {
    type: String,
    required: true,
    index: true
  },

  creativeDirection: {
    type: creativeDirectionSchema,
    default: () => ({})
  },

  thumbnailUrl: {
    type: String,
    default: null
  },

  referenceFiles: [String],

  applicationDeadline: {
    type: Date,
    required: true
  },

  // Track video submissions
  videoSubmissions: [videoSubmissionSchema],

  // Current active submission (if any)
  currentSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },

  // Selected clipper
  selectedClipper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Final approved video
  finalVideo: {
    url: String,
    thumbnailUrl: String,
    approvedAt: Date,
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    }
  },

  // Status lifecycle
  status: {
    type: String,
    enum: [
      'draft',
      'active',
      'closed',
      'video_submitted',     // When video is submitted by clipper
      'revision_submitted',   // When revised video is submitted
      'completed',
      'cancelled',
    ],
    default: 'draft',
    index: true
  },

  // Audit fields
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  closedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledReason: String

}, { timestamps: true });

// Indexes
campaignSchema.index({ advertiser: 1, status: 1, createdAt: -1 });
campaignSchema.index({ category: 1, status: 1, applicationDeadline: 1 });
campaignSchema.index({ applicationDeadline: 1 });

// Methods
campaignSchema.methods.activate = async function () {
  if (this.status !== 'draft') {
    throw new Error(`Cannot activate campaign in status: ${this.status}`);
  }
  if (this.applicationDeadline <= new Date()) {
    throw new Error('Application deadline must be in the future');
  }
  this.status = 'active';
  return this.save();
};

campaignSchema.methods.close = async function (reason = '') {
  if (!['active'].includes(this.status)) {
    throw new Error(`Cannot close campaign in status: ${this.status}`);
  }
  this.status = 'closed';
  this.closedAt = new Date();
  if (reason) this.cancelledReason = reason;
  return this.save();
};

campaignSchema.methods.markCompleted = async function () {
  if (this.status !== 'active' && this.status !== 'closed' && this.status !== 'video_submitted' && this.status !== 'revision_submitted') {
    throw new Error(`Cannot mark as completed from status: ${this.status}`);
  }
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

campaignSchema.methods.cancel = async function (reason) {
  if (['completed', 'cancelled'].includes(this.status)) {
    throw new Error(`Cannot cancel campaign in status: ${this.status}`);
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledReason = reason || 'Cancelled by advertiser/admin';
  return this.save();
};

campaignSchema.methods.addVideoSubmission = async function (applicationId, clipperId, videoUrl, thumbnailUrl) {
  const submission = {
    applicationId,
    clipperId,
    videoUrl,
    thumbnailUrl,
    submissionDate: new Date(),
    status: 'pending_review'
  };

  this.videoSubmissions.push(submission);
  
  // Update campaign status
  if (this.status === 'active' || this.status === 'closed') {
    this.status = 'video_submitted';
  } else if (this.status === 'revision_requested') {
    this.status = 'revision_submitted';
  }

  this.currentSubmission = applicationId;
  this.selectedClipper = clipperId;

  return this.save();
};

campaignSchema.methods.requestRevision = async function (submissionId, feedback, advertiserId) {
  const submission = this.videoSubmissions.id(submissionId);
  if (!submission) throw new Error('Submission not found');

  submission.status = 'revision_requested';
  submission.revisionCount += 1;
  submission.feedback.push({
    message: feedback,
    createdAt: new Date(),
    fromAdvertiser: advertiserId
  });

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

  if (this.status === 'active' && this.applicationDeadline < new Date()) {
    this.status = 'closed';
    this.closedAt = new Date();
  }

  next();
});

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);