// File: express_backend/models/DepositRequest.js

import mongoose from 'mongoose';

const depositRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USDT'], default: 'NGN' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['paystack', 'bank_transfer', 'usdt'],
    required: true
  },
  receiptUrl: String,
  reference: String, // For Paystack reference
  txHash: String,    // For USDT transaction hash
  fromAddress: String, // For USDT sender address
  network: String,   // For USDT network (TRC20, ERC20, BEP20)
  adminNotes: String,
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('DepositRequest', depositRequestSchema);