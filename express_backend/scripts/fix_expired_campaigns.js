// run once: node scripts/fix_expired_campaigns.js
// Migrates legacy 'expired' campaigns to the correct status in the new model.
// Safe to run multiple times — only touches documents with status='expired'.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const Campaign = mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));

// 1. Campaigns with status='expired' whose deadline has passed → 'closed'
const closedResult = await Campaign.updateMany(
  { status: 'expired', applicationDeadline: { $lt: new Date() } },
  { $set: { status: 'closed', closedAt: new Date() } }
);
console.log(`✅ Marked ${closedResult.modifiedCount} expired (past deadline) → closed`);

// 2. Campaigns with status='expired' whose deadline is still future → 'active'
//    (edge case: somehow flagged expired but deadline not yet passed)
const activeResult = await Campaign.updateMany(
  { status: 'expired', applicationDeadline: { $gt: new Date() } },
  { $set: { status: 'active' } }
);
console.log(`✅ Marked ${activeResult.modifiedCount} expired (future deadline) → active`);

await mongoose.disconnect();
console.log('Done. No more legacy expired campaigns.');