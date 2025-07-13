// File: express_backend/models/Transaction.js

import mongoose from 'mongoose';

// Transaction schema: credits/debits for users
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // one of four types
  type: {
    type: String,
    enum: ['deposit','withdrawal','credit','debit'],
    required: true
  },
  amount:    { type: Number, required: true },

  // optional links back to campaign or submission
  campaign:           { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  related_submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },

  note: String  // free-form description, e.g. “Paid for 512 verified views”
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
