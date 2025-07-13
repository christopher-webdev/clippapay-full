// File: express_backend/models/SubscriptionPlan.js

import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  market: {
    type: String,
    enum: ['nigeria','global'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  durationMonths: {
    type: Number,
    default: 1
  },
  perks: {
    type: [String],
    default: []
  }
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
