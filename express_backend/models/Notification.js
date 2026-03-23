// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives this notification
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },

  // Notification type for filtering and UI handling
  type: {
    type: String,
    enum: [
      'new_application',
      'offer_received',
      'offer_accepted',
      'offer_expired',
      'submission_received',
      'revision_requested',
      'payment_received',
      'dispute_raised',
      'dispute_resolved',
      'payment_received',
      
      // Campaign updates
      'campaign_approved',
      'campaign_rejected',
      'campaign_completed',
      'campaign_paused',
      'campaign_activated',
      
      // Wallet/Transactions
      'deposit_confirmed',
      'withdrawal_approved',
      'withdrawal_processed',
      'withdrawal_rejected',
      'wallet_credited',
      'wallet_debited',
      'low_balance',
      
      // System
      'system_alert',
      'maintenance',
      'security_alert',
      
      // Admin
      'admin_action_required',
      'user_reported',
      'dispute_raised',
      'new_ugc_pending',
      'campaign_auto_completed',
      'clipping_joined',
      'clipping_approved',
      'offer_declined',
    ],
    required: true
  },

  // Display content
  title: { 
    type: String, 
    required: true 
  },
  
  message: { 
    type: String, 
    required: true 
  },

  // Rich content (optional)
  richContent: {
    image: String,
    video: String,
    link: String,
    buttonText: String,
    buttonAction: String,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Read status
  read: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  
  readAt: Date,

  // Action status (for actionable notifications)
  actionTaken: {
    type: Boolean,
    default: false
  },
  
  actionTakenAt: Date,
  actionType: String, // 'accept', 'reject', 'view', 'dismiss'
  actionData: mongoose.Schema.Types.Mixed,

  // Importance levels
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Expiration
  expiresAt: Date,
  
  // For grouping similar notifications
  groupId: String,
  
  // Reference data for deep linking
  data: {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
    depositId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposit' },
    
    // Additional data
    amount: Number,
    status: String,
    reason: String,
    customData: mongoose.Schema.Types.Mixed
  },

  // Email delivery status
  emailSent: { type: Boolean, default: false },
  emailSentAt: Date,
  emailError: String,

  // Push notification delivery status (for future mobile)
  pushDelivered: { type: Boolean, default: false },
  pushDeliveredAt: Date,
  pushError: String,

  // In-app delivered
  inAppDelivered: { type: Boolean, default: true },

  // Metadata
  source: {
    type: { type: String, enum: ['system', 'user', 'admin', 'automated'] },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markActionTaken = function(actionType, actionData = {}) {
  this.actionTaken = true;
  this.actionTakenAt = new Date();
  this.actionType = actionType;
  this.actionData = actionData;
  return this.save();
};

notificationSchema.methods.markEmailSent = function() {
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

notificationSchema.methods.markEmailFailed = function(error) {
  this.emailError = error;
  return this.save();
};

// For future mobile push
notificationSchema.methods.markPushDelivered = function() {
  this.pushDelivered = true;
  this.pushDeliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.markPushFailed = function(error) {
  this.pushError = error;
  return this.save();
};

// Statics
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ user: userId, read: false });
};

notificationSchema.statics.getForUser = function(userId, limit = 50, skip = 0) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-expire after 30 days if not set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  next();
});

export default mongoose.model('Notification', notificationSchema);