// File: express_backend/models/ClipperProfile.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const clipperProfileSchema = new Schema(
  {
    // Reference to the User (must be a clipper)
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One profile per user
    },

    // Available to ALL clippers
    profileImage: {
      type: String,
      default: null,
      // Example: "/uploads/clipper-profiles/abc123.jpg"
    },

    sampleVideo: {
      type: String,
      default: null,
      // Example: "/uploads/clipper-profiles/video-xyz.mp4"
    },

    // Premium-only fields (only editable if isPremiumCreator === true)
    bio: {
      type: String,
      default: '',
      maxlength: 500, // reasonable limit for short bio
    },

    categories: {
      type: [String],
      default: [],
      // Example: ["Tech", "Fitness", "Travel"]
    },

    ratePerVideo: {
      type: Number,
      min: 0,
      default: 0,
      // In Naira, e.g. 15000
    },

    expectedDelivery: {
      type: String,
      default: '',
      maxlength: 100,
      // Example: "3-5 days", "1 week", etc.
    },

    completedProjects: {
      type: Number,
      min: 0,
      default: 0,
      // Number of finished campaigns/projects
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: Enforce that only clippers can have profiles
 * Optional: you can make premium fields required only for premium users
 */
clipperProfileSchema.pre('save', async function (next) {
  try {
    const user = await mongoose.model('User').findById(this.user);
    if (!user) {
      return next(new Error('Associated user not found'));
    }

    if (user.role !== 'clipper') {
      return next(new Error('Only users with role "clipper" can have a clipper profile'));
    }

    // Optional: warn or prevent saving premium fields if not premium
    // (you can remove this block if you prefer silent ignore instead)
    if (!user.isPremiumCreator) {
      if (
        this.bio ||
        this.categories?.length > 0 ||
        this.ratePerVideo > 0 ||
        this.expectedDelivery ||
        this.completedProjects > 0
      ) {
        // You can either:
        // 1. Reset them silently
        this.bio = '';
        this.categories = [];
        this.ratePerVideo = 0;
        this.expectedDelivery = '';
        this.completedProjects = 0;

        // OR 2. Prevent save
        // return next(new Error('Premium fields can only be set by premium creators'));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Virtual field: convenience to get the user's rating and premium status
 */
clipperProfileSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
});

clipperProfileSchema.set('toObject', { virtuals: true });
clipperProfileSchema.set('toJSON', { virtuals: true });

export default mongoose.model('ClipperProfile', clipperProfileSchema);