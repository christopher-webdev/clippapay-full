// models/ClippingCampaign.js
import mongoose from 'mongoose';

const clippingCampaignSchema = new mongoose.Schema({
  // Reference to the advertiser
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Basic campaign info
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100,
  },

  // Video source
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },

  // Budget and pricing
  budget: {
    type: Number,
    required: true,
    min: 0,
  },

  currency: {
    type: String,
    enum: ['NGN', 'USDT'],
    required: true,
  },

  costPerThousand: {
    type: Number,
    required: true,
  },

  estimatedViews: {
    type: Number,
    required: true,
  },

  // Targeting
  platforms: [{
    type: String,
    enum: ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'twitter'],
  }],

  categories: [{
    type: String,
    required: true,
  }],

  // Guidelines for creators
  hashtags: [{
    type: String,
    trim: true,
  }],

  directions: [{
    type: String,
    trim: true,
  }],

  // Call to action
  ctaUrl: {
    type: String,
    trim: true,
  },

  // Campaign status
  status: {
    type: String,
    enum: ['waiting_for_approval', 'active', 'completed', 'cancelled'],
    default: 'waiting_for_approval',
  },

  // Stats
  totalSpent: {
    type: Number,
    default: 0,
  },

  totalViews: {
    type: Number,
    default: 0,
  },

  clipsCreated: {
    type: Number,
    default: 0,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // When campaign was completed/cancelled
  completedAt: Date,
  cancelledAt: Date,

  // Tracking
  views: [{
    clipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clip' },
    platform: String,
    views: Number,
    date: Date,
  }],

  // Escrow transaction reference
  escrowTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
}, {
  timestamps: true,
});

// Index for better query performance
clippingCampaignSchema.index({ advertiser: 1, status: 1 });
clippingCampaignSchema.index({ createdAt: -1 });
clippingCampaignSchema.index({ categories: 1 });

// Virtual for remaining budget
clippingCampaignSchema.virtual('remainingBudget').get(function() {
  return this.budget - this.totalSpent;
});

// Virtual for completion percentage
clippingCampaignSchema.virtual('completionPercentage').get(function() {
  if (this.estimatedViews === 0) return 0;
  return Math.min(100, Math.round((this.totalViews / this.estimatedViews) * 100));
});

export default mongoose.models.ClippingCampaign || 
       mongoose.model('ClippingCampaign', clippingCampaignSchema);