// File: express_backend/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // one of: 'info','success','warning','error'
  level: {
    type: String,
    enum: ['info','success','warning','error'],
    default: 'info'
  },
  title:   { type: String, required: true },  // e.g. “Funds low”
  message: { type: String, required: true },  // e.g. “Your campaign ‘Summer Sale’ is down to 15% of budget.”
  link:    String,   // optional URL the notification should point to
  isRead:  { type: Boolean, default: false }, // unread by default
  meta:    mongoose.Schema.Types.Mixed       // optional extra data
}, { timestamps: true });

/**
 * Mark this notification as read.
 */
notificationSchema.methods.markRead = function() {
  this.isRead = true;
  return this.save();
};

export default mongoose.model('Notification', notificationSchema);
