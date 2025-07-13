import Campaign from '../models/Campaign.js';
import User from '../models/User.js';

export default async function getNextAdWorker() {
  const workers = await User.find({ role: 'ad-worker' }).sort('createdAt');
  if (!workers.length) throw new Error('No ad-workers available');
  const count = await Campaign.countDocuments();
  // simple even spread: campaign #0 → worker[0], #1 → worker[1], … #n → workers[n % workers.length]
  return workers[count % workers.length];
}
