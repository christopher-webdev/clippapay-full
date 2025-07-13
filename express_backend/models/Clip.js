import mongoose from 'mongoose';
const { Schema } = mongoose;

const clipSchema = new Schema({
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  adWorker: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  // optional index so an ad-worker can order clips
  index: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Clip', clipSchema);
