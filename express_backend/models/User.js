// File: express_backend/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User schema: stores authentication credentials, profile info,
 * roles (clipper/advertiser/admin), security flags, and payment details.
 */
const userSchema = new mongoose.Schema({
  // Determines which dashboard/features the user can access
  role: {
    type: String,
    enum: ['clipper', 'advertiser', 'admin', 'ad-worker', 'platform'],
    required: true
  },

  // Super-admin flag (only one initial signup; then disable that route)
  isSuperAdmin: {
    type: Boolean,
    default: false
  },

  resetCode: String,
  resetExpires: Date,

  // Login credentials
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  // ----------------------------
  // Contact & Profile
  // ----------------------------
  phone:   String,
  country: String,

  // Clipper-specific fields
  firstName: String,
  lastName:  String,

  // ----------------------------
  // ⭐ PERFORMANCE PREMIUM SYSTEM
  // ----------------------------

  // Clipper performance rating (0 → 5 scale)
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Auto set based on rating
  isPremiumCreator: {
    type: Boolean,
    default: false
  },

  // ----------------------------
  // Advertiser-specific fields
  // ----------------------------
  contactName: String,
  company:     String,

  creatorTypes: {  
    type: [String],
    default: []
  },

  otherCreatorType: String,

  // ----------------------------
  // Security & Verification
  // ----------------------------
  twoFactorEnabled: { type: Boolean, default: false },
  isBlocked:        { type: Boolean, default: false },
  isVerified:       { type: Boolean, default: false },

  emailOTP: String,
  otpExpires: Date,

  hasJoinedTelegram: {
    type: Boolean,
    default: false
  },

  telegramId: {
    type: String,
    sparse: true
  },

  // ----------------------------
  // Wallet & Transactions
  // ----------------------------
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },

  // ----------------------------
  // Payment Preferences
  // ----------------------------
  paymentMethod: {
    type: String,
    enum: ['USDT', 'Bank'],
    default: 'Bank'
  },

  usdtAddress:     String,
  usdtNetwork:     String,
  payBankName:      String,
  payAccountNumber: String,
  payAccountName:   String,

}, { timestamps: true });

/**
 * ⭐ AUTO PREMIUM LOGIC
 * If clipper rating >= 4 → premium creator
 */
// userSchema.pre('save', function(next) {
//   if (this.role === 'clipper' && this.rating >= 4) {
//     this.isPremiumCreator = true;
//   } else {
//     this.isPremiumCreator = false;
//   }
//   next();
// });

userSchema.pre('save', function(next) {
  if (this.role === 'clipper' && this.rating >= 4 && !this.isPremiumCreator) {
    this.isPremiumCreator = true;
  }
  // Removed the else clause to allow manual setting to true even if rating < 4
  next();
});
/**
 * Hashes a plaintext password and stores it in passwordHash.
 */
userSchema.methods.setPassword = async function(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

/**
 * Compares a plaintext password against the stored hash.
 */
userSchema.methods.validatePassword = async function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);


// // File: express_backend/models/User.js

// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// /**
//  * User schema: stores authentication credentials, profile info,
//  * roles (clipper/advertiser/admin), security flags, and payment details.
//  */
// const userSchema = new mongoose.Schema({
//   // Determines which dashboard/features the user can access
//   role: {
//     type: String,
//     enum: ['clipper', 'advertiser', 'admin', 'ad-worker', 'platform',],
//     required: true
//   },

//   // Super-admin flag (only one initial signup; then disable that route)
//   isSuperAdmin: {
//     type: Boolean,
//     default: false
//   },
//   resetCode: String,
//   resetExpires: Date,

//   // Login credentials
//   email:        { type: String, required: true, unique: true },
//   passwordHash: { type: String, required: true },

//   // ----------------------------
//   // Contact & Profile
//   // ----------------------------
//   phone:   String,
//   country: String,

//   // Clipper-specific fields
//   firstName: String,
//   lastName:  String,

//   // ----------------------------
//   // ⭐ PREMIUM CREATOR SYSTEM
//   // ----------------------------
//   isPremiumCreator: {
//     type: Boolean,
//     default: false
//   },


  

//   // Advertiser-specific fields
//   contactName: String,
//   company:     String,
//   creatorTypes: {  
//     type: [String],
//     default: []
//   },
//   otherCreatorType: String, // For "Other" specification

//   // ----------------------------
//   // Security & Verification
//   // ----------------------------
//   twoFactorEnabled: { type: Boolean, default: false },
//   isBlocked:        { type: Boolean, default: false },
//   isVerified:       { type: Boolean, default: false },
//   emailOTP:         String,
//   otpExpires:       Date,
 
//   hasJoinedTelegram: {
//     type: Boolean,
//     default: false
//   },
//   telegramId: {
//     type: String,
//     sparse: true // allows null but unique when exists
//   },
//   // ----------------------------
//   // Wallet & Transactions
//   // ----------------------------
//   wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },

//   // ----------------------------
//   // Payment Preferences
//   // ----------------------------
//   paymentMethod: {
//     type: String,
//     enum: ['USDT', 'Bank'],
//     default: 'Bank'
//   },
//   usdtAddress:     String,
//   usdtNetwork:     String,
//   payBankName:      String,
//   payAccountNumber: String,
//   payAccountName:   String,
// }, { timestamps: true });

// /**
//  * Hashes a plaintext password and stores it in passwordHash.
//  * @param {string} plain - The plaintext password.
//  */
// userSchema.methods.setPassword = async function(plain) {
//   this.passwordHash = await bcrypt.hash(plain, 10);
// };

// /**
//  * Compares a plaintext password against the stored hash.
//  * @param {string} plain - The plaintext password to verify.
//  * @returns {Promise<boolean>}
//  */
// userSchema.methods.validatePassword = async function(plain) {
//   return bcrypt.compare(plain, this.passwordHash);
// };



// export default mongoose.model('User', userSchema);
