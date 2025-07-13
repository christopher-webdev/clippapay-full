// File: express_backend/models/Subscription.js

import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },

  // Payment info
  paymentMethod: {
    type: String,
    enum: ['bank', 'usdt'],
    required: true
  },
  // Bank details (for Nigerian market)
  bankName:      String,
  accountNumber: String,
  accountName:   String,
  // USDT details (for global market)
  usdtNetwork:   String,

  receiptUrl:    String,  // path to uploaded receipt file

  // Lifecycle
  status: {
    type: String,
    enum: ['pending','active','cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending','verified','rejected'],
    default: 'pending'
  },
  startDate:   Date,
  endDate:     Date,
  verifiedAt:  Date,
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
