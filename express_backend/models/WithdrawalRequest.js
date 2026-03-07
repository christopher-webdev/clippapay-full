// File: express_backend/models/WithdrawalRequest.js

import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USDT'], required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'declined'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank', 'usdt'],
    required: true
  },
  
  // Bank details (for NGN)
  bank_name: String,
  account_number: String,
  account_name: String,
  
  // USDT details (for USDT)
  usdt_address: String,
  usdt_network: String,
  
  declineReason: String,
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // For tracking
  reference: String,
  txHash: String // For USDT payout hash
}, { timestamps: true });

export default mongoose.model('WithdrawalRequest', withdrawalRequestSchema);