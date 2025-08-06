// model campaign.js


import mongoose from 'mongoose';
const { Schema } = mongoose;

const campaignSchema = new Schema({
  advertiser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  thumb_url: String,
  video_url: String,

  // FINANCIALS & VIEWS
  rate_per_1000: { type: Number, default: 600, required: true }, // advertiser pays per 1000 views
  clipper_cpm: { type: Number, default: 200 }, // amount clippers get per 1000 views
  budget_total: { type: Number, required: true },
  budget_remaining: { type: Number, required: true },
  views_purchased: { type: Number, required: true }, // NEW
  views_left: { type: Number, required: true }, // updated as clippers' views are verified

  platforms: { type: [String], enum: ['tiktok','instagram','youtube','facebook', 'X'], required: true },
  countries: [String],
  hashtags:  [String],
  directions:[String],
  cta_url:   String,
  categories:[String],

  numClipsSuggested: { type: Number, min: 1, max: 6 },
  adWorkerPercentage: { type: Number, default: 20, min: 0, max: 100 },
  adWorkerStatus: {
    type: String,
    enum: ['pending','processing','ready','rejected'],
    default: 'pending'
  },
  assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
  clippersCount: { type: Number, default: 0 },
  lowFundsThreshold: { type: Number, default: 0.2 },
  status: {
    type: String,
    enum: ['pending','active','paused','completed','cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

/**
 * Increment participant count when a clipper joins.
 */
campaignSchema.methods.incrementClippers = function() {
  this.clippersCount++;
  return this.save();
};

/**
 * Deduct views & corresponding budget after verification.
 * @param {number} views
 */
campaignSchema.methods.deductViewsAndBudget = async function(views) {
  // Reduce views_left and budget_remaining
  this.views_left = Math.max(0, this.views_left - views);
  this.budget_remaining = Math.max(0, this.budget_remaining - (views * this.rate_per_1000 / 1000));

  // Auto-complete: mark as completed if views_left is 0
  if (this.views_left <= 0) {
    this.status = 'completed';
  }
  await this.save();
};
// In models/Campaign.js

campaignSchema.methods.restoreViewsAndBudget = async function(views) {
  const CPM = this.clipper_cpm || 200;
  const viewRate = CPM / 1000;
  const budgetRestore = views * viewRate;

  this.views_left += views;
  this.budget_remaining += budgetRestore;
  await this.save();
}

/**
 * Prevent joining if campaign is >= 80% completed
 */
campaignSchema.methods.canClipperJoin = function() {
  const completed = 1 - (this.views_left / this.views_purchased);
  return completed < 0.8;
};

export default mongoose.model('Campaign', campaignSchema);
