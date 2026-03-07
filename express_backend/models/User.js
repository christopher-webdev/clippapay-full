import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/* ================================
   Push Token Schema
================================ */
const pushTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true 
  },
  device: { 
    type: String, 
    default: 'unknown' 
  },
  platform: { 
    type: String, 
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown'
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

/* ================================
   User Schema
================================ */
const userSchema = new mongoose.Schema({

  /* ---------- Role ---------- */
  role: {
    type: String,
    enum: ['clipper', 'advertiser', 'admin', 'ad-worker', 'platform'],
    required: true
  },

  isSuperAdmin: {
    type: Boolean,
    default: false
  },

  /* ---------- Auth ---------- */
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  passwordHash: { 
    type: String, 
    required: true 
  },

  resetCode: String,
  resetExpires: Date,

  emailOTP: String,
  otpExpires: Date,

  twoFactorEnabled: { 
    type: Boolean, 
    default: false 
  },

  /* ---------- Basic Info ---------- */
  firstName: String,
  lastName: String,
  phone: String,
  country: String,

  /* ---------- Advertiser Fields ---------- */
  company: String,
  contactName: String,

  /* ---------- Creator Profile Fields ---------- */

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  profileImage: {
    type: String,
    default: null
  },

  // MAX 3 VIDEOS
  sampleVideos: {
    type: [String],
    default: [],
    validate: {
      validator: function (arr) {
        return arr.length <= 3;
      },
      message: 'Maximum 3 sample videos allowed'
    }
  },

  bio: {
    type: String,
    default: '',
    maxlength: 500
  },

  categories: {
    type: [String],
    default: []
  },


  /* ---------- Telegram ---------- */
  hasJoinedTelegram: {
    type: Boolean,
    default: false
  },

  telegramId: {
    type: String,
    sparse: true
  },

  /* ---------- Wallet ---------- */
  wallet: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Wallet' 
  },

  paymentMethod: {
    type: String,
    enum: ['USDT', 'Bank'],
    default: 'Bank'
  },

  usdtAddress: String,
  usdtNetwork: String,
  payBankName: String,
  payAccountNumber: String,
  payAccountName: String,

  /* ---------- System Flags ---------- */
  isBlocked: { 
    type: Boolean, 
    default: false 
  },

  isVerified: { 
    type: Boolean, 
    default: false 
  },

  /* ---------- Push Tokens ---------- */
  pushTokens: [pushTokenSchema]

}, { timestamps: true });


/* ================================
   Password Helpers
================================ */
userSchema.methods.setPassword = async function(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.validatePassword = async function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/* ================================
   Safe Export (Prevents OverwriteModelError)
================================ */
export default mongoose.models.User || 
       mongoose.model('User', userSchema);