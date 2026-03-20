// File: express_backend/models/Transaction.js

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'deposit',
      'withdrawal',
      'payment',
      'refund',
      'commission',
      'campaign_funding',   // advertiser funds a clipping campaign (escrow)
      'clipping_reward',    // clipper earns from verified views
      'campaign_payment',   // generic campaign spend
      'escrow',             // escrow hold
      'escrow_release',     // escrow released to clipper/platform
    ],
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USDT'], default: 'NGN' },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  reference: String,
  note: String,
  description: String,     // used by clipping_reward logs
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);