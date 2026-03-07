// File: express_backend/models/Transaction.js

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'payment', 'refund', 'commission'],
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
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
