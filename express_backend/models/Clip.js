// File: express_backend/models/Clip.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const clipSchema = new Schema({
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  adWorker: {  // Clipper for PGC
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  status: {  // New: for PGC approvals
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // optional index so an ad-worker can order clips
  index: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Clip', clipSchema);