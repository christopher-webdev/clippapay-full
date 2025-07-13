import mongoose from 'mongoose';

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
    required: true
  },
  status: {
    type: String,
    enum: ['pending','approved','rejected'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('DepositRequest', depositRequestSchema);
