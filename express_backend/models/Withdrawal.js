// File: express_backend/models/Withdrawal.js
import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },

  // Whether this is a bank transfer or a USDT payout
  paymentMethod: {
    type: String,
    enum: ['bank', 'usdt'],
    required: true
  },

  // Bank details (for paymentMethod==='bank')
  bank_name:      String,
  account_number: String,
  account_name:   String,

  // USDT details (for paymentMethod==='usdt')
  usdt_address:   String,
  usdt_network:   String,

  // (Optional) proof of transfer by clipper/admin
  receipt_url:    String,

  // Timestamps
  requestedAt: { type: Date, default: Date.now },
  processedAt: Date,

  status: {
    type: String,
    enum: ['pending','paid','declined'],
    default: 'pending'
  },
  declineReason: String
}, { timestamps: true });

/**
 * Mark this withdrawal paid.
 * We pass `{ validateBeforeSave: false }` so that missing
 * fields (like paymentMethod on older docs) won’t error us out.
 */
withdrawalSchema.methods.markPaid = function() {
  this.status      = 'paid';
  this.processedAt = new Date();
  return this.save({ validateBeforeSave: false });
};

/**
 * Mark this withdrawal declined.
 */
withdrawalSchema.methods.markDeclined = function(reason) {
  this.status        = 'declined';
  this.declineReason = reason;
  this.processedAt   = new Date();
  return this.save({ validateBeforeSave: false });
};

export default mongoose.model('Withdrawal', withdrawalSchema);
