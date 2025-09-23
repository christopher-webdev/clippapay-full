import mongoose from 'mongoose';

// In DepositRequest.js
const depositRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  receiptUrl: {
    type: String,
    // Make not required for Paystack payments
    required: function() { return this.paymentMethod !== 'paystack'; }
  },
  status: {
    type: String,
    enum: ['pending','approved','rejected'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank', 'usdt', 'paystack'],
    default: 'bank'
  },
  reference: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness for non-null
  }
}, { timestamps: true });

export default mongoose.model('DepositRequest', depositRequestSchema);
