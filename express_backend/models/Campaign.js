// File: express_backend/models/Campaign.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const campaignSchema = new Schema({
  advertiser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  thumb_url: String,
  video_url: String,
  kind: { type: String, enum: ['normal', 'ugc', 'pgc'], default: 'normal', index: true },

  ugc: {
    brief: { type: String },
    deliverables: { type: [String], default: [] },
    assets: { type: [String], default: [] },
    draftRequired: { type: Boolean, default: true },
    creativeDeadline: Date,
    postDeadline: Date,
    captionTemplate: String,
    hashtags: { type: [String], default: [] },
    usageRights: { type: String },
    approvalCriteria: { type: String },
  },

  // FINANCIALS & VIEWS
  rate_per_1000: { type: Number, default: 1200, required: true }, // Advertiser CPM
  clipper_cpm: { type: Number, default: 500 },                   // Clipper payout CPM
  budget_total: { type: Number, required: true },
  budget_remaining: { type: Number, required: true },
  views_purchased: { type: Number },
  views_left: { type: Number },

  // PGC-specific
  desiredVideos: { type: Number, min: 1, max: 500 },
  approvedVideosCount: { type: Number, default: 0 },

  // NEW UGC VERSIONING FIELD
  ugcVersion: { type: Number, default: 1 },   // <= ADD THIS

  // NEW UGC HYBRID MODEL FIELDS (50/50 split)
  clipperSlots: { type: Number, default: 0 },           // How many fixed clippers this campaign pays for
  approvedClipperCount: { type: Number, default: 0 },   // How many have been paid ₦2,000 so far
  fixedClipperPayout: { type: Number, default: 2000 },  // ₦2,000 per approved clipper
  platformFeePerClipper: { type: Number, default: 500 }, // ₦500 platform fee per clipper

  // Targeting & Settings
  platforms: { type: [String], enum: ['tiktok','instagram','youtube','facebook', 'X', 'whatsapp'] },
  countries: [String],
  hashtags: [String],
  directions: [String],
  cta_url: String,
  categories: [String],

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

// ────────────────────────────────
// PRE-VALIDATION HOOK
// ────────────────────────────────
campaignSchema.pre('validate', function(next) {
  if (this.kind === 'ugc') {
    // UGC: 50/50 split → we calculate everything on creation
    if (!this.isModified('rate_per_1000')) this.rate_per_1000 = 5000;     // ₦5 per view (advertiser cost)
    if (!this.isModified('clipper_cpm'))   this.clipper_cpm   = 2000;     // ₦2 per view (clipper payout)
  } 
  else if (this.kind === 'pgc') {
    this.rate_per_1000 = 7500;
    this.clipper_cpm = 5000;
    if (!this.desiredVideos) this.desiredVideos = 1;
    if (this.budget_total < 7500 * this.desiredVideos) {
      next(new Error(`Budget must be at least ₦${7500 * this.desiredVideos} for ${this.desiredVideos} videos.`));
    }
    this.views_purchased = this.budget_total / 7500;
    this.views_left = this.views_purchased;
  }
  next();
});

// ────────────────────────────────
// INSTANCE METHODS
// ────────────────────────────────
campaignSchema.methods.incrementClippers = function() {
  this.clippersCount++;
  return this.save();
};

campaignSchema.methods.deductViewsAndBudget = async function(views) {
  if (this.kind === 'pgc') throw new Error('Use approveVideo for PGC campaigns');
  this.views_left = Math.max(0, this.views_left - views);
  this.budget_remaining = Math.max(0, this.budget_remaining - (views * this.rate_per_1000 / 1000));
  if (this.views_left <= 0) this.status = 'completed';
  await this.save();
};

campaignSchema.methods.approveVideo = async function(videoCount = 1) {
  if (this.kind !== 'pgc') throw new Error('approveVideo is for PGC only');
  const cost = videoCount * 7500;
  if (this.budget_remaining < cost) throw new Error('Insufficient remaining budget');

  this.approvedVideosCount += videoCount;
  this.budget_remaining -= cost;

  if (this.approvedVideosCount >= this.desiredVideos) {
    this.status = 'completed';
  }
  await this.save();
};

campaignSchema.methods.restoreViewsAndBudget = async function(views) {
  const CPM = this.clipper_cpm || 500;
  const viewRate = CPM / 1000;
  const budgetRestore = views * viewRate;

  this.views_left += views;
  this.budget_remaining += budgetRestore;
  await this.save();
};

campaignSchema.methods.canClipperJoin = function() {
  if (this.kind === 'pgc') {
    return this.approvedVideosCount < this.desiredVideos;
  }
  if (this.kind === 'ugc') {
    // UGC: clippers can join until all fixed slots are paid
    return this.approvedClipperCount < this.clipperSlots;
  }
  const completed = 1 - (this.views_left / this.views_purchased);
  return completed < 0.8;
};

// NEW METHOD: Approve a UGC clipper (pay ₦2,000 + ₦500 fee)
campaignSchema.methods.approveUGCClipper = async function() {
  if (this.kind !== 'ugc') throw new Error('Only for UGC campaigns');
  if (this.approvedClipperCount >= this.clipperSlots) {
    throw new Error('All clipper slots already filled');
  }

  const totalCost = this.fixedClipperPayout + this.platformFeePerClipper;
  if (this.budget_remaining < totalCost) {
    throw new Error('Insufficient budget remaining');
  }

  this.approvedClipperCount += 1;
  this.budget_remaining -= totalCost;

  // Auto-complete if all slots + views are done
  if (this.approvedClipperCount >= this.clipperSlots && this.views_left <= 0) {
    this.status = 'completed';
  }

  await this.save();
  return this;
};

export default mongoose.model('Campaign', campaignSchema);
// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const campaignSchema = new Schema({
//   advertiser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   title: { type: String, required: true },
//   thumb_url: String,
//   video_url: String,
//   kind: { type: String, enum: ['normal', 'ugc', 'pgc'], default: 'normal', index: true }, // Added 'pgc'
  
//   ugc: {  // Reused for PGC too (rename to 'generatedContent' if preferred)
//     brief:        { type: String },
//     deliverables: { type: [String], default: [] },
//     assets:       { type: [String], default: [] },
//     draftRequired:{ type: Boolean, default: true },
//     creativeDeadline: Date,
//     postDeadline:     Date,
//     captionTemplate:  String,
//     hashtags:         { type: [String], default: [] },
//     usageRights:      { type: String },
//     approvalCriteria: { type: String }, // New for PGC
//   },

//   // FINANCIALS & VIEWS (adapted for PGC: flat fee, no views)
//   rate_per_1000: { type: Number, default: 1200, required: true }, // Ignored for PGC
//   clipper_cpm: { type: Number, default: 500 }, // Ignored for PGC
//   budget_total: { type: Number, required: true },
//   budget_remaining: { type: Number, required: true },
//   views_purchased: { type: Number }, // Optional for PGC
//   views_left: { type: Number }, // Optional for PGC
//   desiredVideos: { type: Number, min: 1, max: 500 }, // PGC-specific
//   approvedVideosCount: { type: Number, default: 0 }, // PGC-specific

//   platforms: { type: [String], enum: ['tiktok','instagram','youtube','facebook', 'X'] }, // Optional for PGC
//   countries: [String],
//   hashtags:  [String],
//   directions:[String],
//   cta_url:   String,
//   categories:[String],

//   numClipsSuggested: { type: Number, min: 1, max: 6 },
//   adWorkerPercentage: { type: Number, default: 20, min: 0, max: 100 },
//   adWorkerStatus: {
//     type: String,
//     enum: ['pending','processing','ready','rejected'],
//     default: 'pending'
//   },
//   assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
//   clippersCount: { type: Number, default: 0 },
//   lowFundsThreshold: { type: Number, default: 0.2 },
//   status: {
//     type: String,
//     enum: ['pending','active','paused','completed','cancelled'],
//     default: 'pending'
//   }
// }, { timestamps: true });

// campaignSchema.pre('validate', function(next){
//   if (this.kind === 'ugc') {
//     if (!this.isModified('rate_per_1000')) this.rate_per_1000 = 5000; // advertiser cost
//     if (!this.isModified('clipper_cpm'))   this.clipper_cpm   = 2000; // clipper payout
//   } else if (this.kind === 'pgc') {
//     // Fixed flat fee; no CPM/views
//     this.rate_per_1000 = 7500; // Per video (advertiser cost)
//     this.clipper_cpm = 5000;   // Per video (clipper payout)
//     if (!this.desiredVideos) this.desiredVideos = 1;
//     if (this.budget_total < 7500 * this.desiredVideos) {
//       next(new Error(`Budget must be at least ₦${7500 * this.desiredVideos} for ${this.desiredVideos} videos.`));
//     }
//     this.views_purchased = this.budget_total / 7500; // Treat as max videos
//     this.views_left = this.views_purchased; // For consistency
//   }
//   next();
// });
// /**
//  * Increment participant count when a clipper joins.
//  */
// campaignSchema.methods.incrementClippers = function() {
//   this.clippersCount++;
//   return this.save();
// };

// /**
//  * Deduct views & corresponding budget after verification.
//  * @param {number} views
//  */
// campaignSchema.methods.deductViewsAndBudget = async function(views) {
//   // Reduce views_left and budget_remaining
//   if (this.kind === 'pgc') throw new Error('Use approveVideo for PGC campaigns');
//   this.views_left = Math.max(0, this.views_left - views);
//   this.budget_remaining = Math.max(0, this.budget_remaining - (views * this.rate_per_1000 / 1000));

//   // Auto-complete: mark as completed if views_left is 0
//   if (this.views_left <= 0) {
//     this.status = 'completed';
//   }
//   await this.save();
// };


// /**
//  * For PGC: Approve a video, deduct flat fee from budget_remaining.
//  * @param {number} videoCount - Usually 1, but can batch
//  */
// campaignSchema.methods.approveVideo = async function(videoCount = 1) {
//   if (this.kind !== 'pgc') throw new Error('approveVideo is for PGC only');
//   const cost = videoCount * 7500;
//   if (this.budget_remaining < cost) throw new Error('Insufficient remaining budget');

//   this.approvedVideosCount += videoCount;
//   this.budget_remaining -= cost;

//   // Auto-complete if all desired videos approved
//   if (this.approvedVideosCount >= this.desiredVideos) {
//     this.status = 'completed';
//   }
//   await this.save();
// };

// campaignSchema.methods.restoreViewsAndBudget = async function(views) {
//   const CPM = this.clipper_cpm || 500;
//   const viewRate = CPM / 1000;
//   const budgetRestore = views * viewRate;

//   this.views_left += views;
//   this.budget_remaining += budgetRestore;
//   await this.save();
// }

// /**
//  * Prevent joining if campaign is >= 80% completed
//  */
// campaignSchema.methods.canClipperJoin = function() {
//   if (this.kind === 'pgc') {
//     return this.approvedVideosCount < this.desiredVideos;
//   }
//   const completed = 1 - (this.views_left / this.views_purchased);
//   return completed < 0.8;
// };

// export default mongoose.model('Campaign', campaignSchema);
