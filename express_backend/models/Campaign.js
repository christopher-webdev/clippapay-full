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

  // PGC-specific addons
  pgcAddons: {
    type: [String],
    enum: ['script', 'whatsapp', 'ig', 'tiktok', 'outdoor'],
    default: []
  },
  
  // User-provided script (if creator doesn't provide)
  script: { type: String, default: '' },

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
  ugcVersion: { type: Number, default: 1 },

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
    // PGC: Base price + addons with specific splits
    const BASE_PRICE = 35000;
    const BASE_PLATFORM_FEE = 15000; // Platform gets ₦15,000 from base
    const BASE_CREATOR_PAYOUT = 20000; // Creator gets ₦20,000 from base
    
    const ADDON_PRICES = {
      script: 1500,
      whatsapp: 5000,
      ig: 10000,
      tiktok: 10000,
      outdoor: 10000,
    };
    
    let totalPrice = BASE_PRICE;
    let addonsTotal = 0;
    
    (this.pgcAddons || []).forEach(addon => {
      if (ADDON_PRICES[addon]) {
        totalPrice += ADDON_PRICES[addon];
        addonsTotal += ADDON_PRICES[addon];
      }
    });
    
    // Calculate creator payout: Base ₦20,000 + 50% of addons
    const addonsCreatorShare = Math.ceil(addonsTotal / 2);
    const totalCreatorPayout = BASE_CREATOR_PAYOUT + addonsCreatorShare;
    
    this.rate_per_1000 = totalPrice; // Total price
    this.clipper_cpm = totalCreatorPayout; // Creator gets ₦20,000 base + 50% of addons
    
    if (!this.desiredVideos) this.desiredVideos = 1;
    if (this.budget_total < totalPrice) {
      next(new Error(`Budget must be at least ₦${totalPrice.toLocaleString()} for PGC video with selected addons.`));
    }
    this.views_purchased = 1; // PGC always 1 video
    this.views_left = 1;
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
  const cost = this.rate_per_1000; // Total price per video
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

// Helper method to get PGC addon breakdown
campaignSchema.methods.getPGCAddonBreakdown = function() {
  if (this.kind !== 'pgc') return null;
  
  const BASE_PRICE = 35000;
  const BASE_PLATFORM_FEE = 15000;
  const BASE_CREATOR_PAYOUT = 20000;
  
  const ADDON_PRICES = {
    script: 1500,
    whatsapp: 5000,
    ig: 10000,
    tiktok: 10000,
    outdoor: 10000,
  };
  
  let addonsTotal = 0;
  const addonDetails = [];
  
  (this.pgcAddons || []).forEach(addon => {
    const price = ADDON_PRICES[addon] || 0;
    addonsTotal += price;
    addonDetails.push({
      id: addon,
      label: this.getAddonLabel(addon),
      price: price,
      platformShare: Math.floor(price / 2),
      creatorShare: Math.ceil(price / 2)
    });
  });
  
  const addonsPlatformShare = Math.floor(addonsTotal / 2);
  const addonsCreatorShare = Math.ceil(addonsTotal / 2);
  
  const totalPlatformFee = BASE_PLATFORM_FEE + addonsPlatformShare;
  const totalCreatorPayout = BASE_CREATOR_PAYOUT + addonsCreatorShare;
  
  return {
    base: {
      price: BASE_PRICE,
      platform: BASE_PLATFORM_FEE,
      creator: BASE_CREATOR_PAYOUT
    },
    addons: addonDetails,
    totals: {
      totalPrice: this.rate_per_1000,
      platformTotal: totalPlatformFee,
      creatorTotal: totalCreatorPayout,
      platformPercentage: Math.round((totalPlatformFee / this.rate_per_1000) * 100),
      creatorPercentage: Math.round((totalCreatorPayout / this.rate_per_1000) * 100)
    }
  };
};

// Helper method to get addon label
campaignSchema.methods.getAddonLabel = function(addonId) {
  const labels = {
    script: 'Creator provides script',
    whatsapp: 'Creator + Post their WhatsApp',
    ig: 'Collaborative - Creator Post on their IG',
    tiktok: 'Creator Post on TikTok',
    outdoor: 'Creator Outdoor shoot'
  };
  return labels[addonId] || addonId;
};

// Method to get total PGC price calculation
campaignSchema.methods.calculatePGCPrice = function() {
  if (this.kind !== 'pgc') return null;
  
  const BASE_PRICE = 35000;
  const ADDON_PRICES = {
    script: 1500,
    whatsapp: 5000,
    ig: 10000,
    tiktok: 10000,
    outdoor: 10000,
  };
  
  let totalPrice = BASE_PRICE;
  (this.pgcAddons || []).forEach(addon => {
    totalPrice += ADDON_PRICES[addon] || 0;
  });
  
  return totalPrice;
};

export default mongoose.model('Campaign', campaignSchema);
// // File: express_backend/models/Campaign.js
// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const campaignSchema = new Schema({
//   advertiser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   title: { type: String, required: true },
//   thumb_url: String,
//   video_url: String,
//   kind: { type: String, enum: ['normal', 'ugc', 'pgc'], default: 'normal', index: true },

//   ugc: {
//     brief: { type: String },
//     deliverables: { type: [String], default: [] },
//     assets: { type: [String], default: [] },
//     draftRequired: { type: Boolean, default: true },
//     creativeDeadline: Date,
//     postDeadline: Date,
//     captionTemplate: String,
//     hashtags: { type: [String], default: [] },
//     usageRights: { type: String },
//     approvalCriteria: { type: String },
//   },

//   // FINANCIALS & VIEWS
//   rate_per_1000: { type: Number, default: 1200, required: true }, // Advertiser CPM
//   clipper_cpm: { type: Number, default: 500 },                   // Clipper payout CPM
//   budget_total: { type: Number, required: true },
//   budget_remaining: { type: Number, required: true },
//   views_purchased: { type: Number },
//   views_left: { type: Number },

//   // PGC-specific
//   desiredVideos: { type: Number, min: 1, max: 500 },
//   approvedVideosCount: { type: Number, default: 0 },

//   // NEW UGC VERSIONING FIELD
//   ugcVersion: { type: Number, default: 1 },   // <= ADD THIS

//   // NEW UGC HYBRID MODEL FIELDS (50/50 split)
//   clipperSlots: { type: Number, default: 0 },           // How many fixed clippers this campaign pays for
//   approvedClipperCount: { type: Number, default: 0 },   // How many have been paid ₦2,000 so far
//   fixedClipperPayout: { type: Number, default: 2000 },  // ₦2,000 per approved clipper
//   platformFeePerClipper: { type: Number, default: 500 }, // ₦500 platform fee per clipper

//   // Targeting & Settings
//   platforms: { type: [String], enum: ['tiktok','instagram','youtube','facebook', 'X', 'whatsapp'] },
//   countries: [String],
//   hashtags: [String],
//   directions: [String],
//   cta_url: String,
//   categories: [String],

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

// // ────────────────────────────────
// // PRE-VALIDATION HOOK
// // ────────────────────────────────
// campaignSchema.pre('validate', function(next) {
//   if (this.kind === 'ugc') {
//     // UGC: 50/50 split → we calculate everything on creation
//     if (!this.isModified('rate_per_1000')) this.rate_per_1000 = 5000;     // ₦5 per view (advertiser cost)
//     if (!this.isModified('clipper_cpm'))   this.clipper_cpm   = 2000;     // ₦2 per view (clipper payout)
//   } 
//   else if (this.kind === 'pgc') {
//     this.rate_per_1000 = 7500;
//     this.clipper_cpm = 5000;
//     if (!this.desiredVideos) this.desiredVideos = 1;
//     if (this.budget_total < 7500 * this.desiredVideos) {
//       next(new Error(`Budget must be at least ₦${7500 * this.desiredVideos} for ${this.desiredVideos} videos.`));
//     }
//     this.views_purchased = this.budget_total / 7500;
//     this.views_left = this.views_purchased;
//   }
//   next();
// });

// // ────────────────────────────────
// // INSTANCE METHODS
// // ────────────────────────────────
// campaignSchema.methods.incrementClippers = function() {
//   this.clippersCount++;
//   return this.save();
// };

// campaignSchema.methods.deductViewsAndBudget = async function(views) {
//   if (this.kind === 'pgc') throw new Error('Use approveVideo for PGC campaigns');
//   this.views_left = Math.max(0, this.views_left - views);
//   this.budget_remaining = Math.max(0, this.budget_remaining - (views * this.rate_per_1000 / 1000));
//   if (this.views_left <= 0) this.status = 'completed';
//   await this.save();
// };

// campaignSchema.methods.approveVideo = async function(videoCount = 1) {
//   if (this.kind !== 'pgc') throw new Error('approveVideo is for PGC only');
//   const cost = videoCount * 7500;
//   if (this.budget_remaining < cost) throw new Error('Insufficient remaining budget');

//   this.approvedVideosCount += videoCount;
//   this.budget_remaining -= cost;

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
// };

// campaignSchema.methods.canClipperJoin = function() {
//   if (this.kind === 'pgc') {
//     return this.approvedVideosCount < this.desiredVideos;
//   }
//   if (this.kind === 'ugc') {
//     // UGC: clippers can join until all fixed slots are paid
//     return this.approvedClipperCount < this.clipperSlots;
//   }
//   const completed = 1 - (this.views_left / this.views_purchased);
//   return completed < 0.8;
// };

// // NEW METHOD: Approve a UGC clipper (pay ₦2,000 + ₦500 fee)
// campaignSchema.methods.approveUGCClipper = async function() {
//   if (this.kind !== 'ugc') throw new Error('Only for UGC campaigns');
//   if (this.approvedClipperCount >= this.clipperSlots) {
//     throw new Error('All clipper slots already filled');
//   }

//   const totalCost = this.fixedClipperPayout + this.platformFeePerClipper;
//   if (this.budget_remaining < totalCost) {
//     throw new Error('Insufficient budget remaining');
//   }

//   this.approvedClipperCount += 1;
//   this.budget_remaining -= totalCost;

//   // Auto-complete if all slots + views are done
//   if (this.approvedClipperCount >= this.clipperSlots && this.views_left <= 0) {
//     this.status = 'completed';
//   }

//   await this.save();
//   return this;
// };

// export default mongoose.model('Campaign', campaignSchema);
