import mongoose from 'mongoose';
import ClipSubmission from './models/ClipSubmission.js'; // Adjust path as needed

// Connect to MongoDB (adjust URI)
await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME');

// Find all submissions that do NOT have a 'proofs' array
const flatSubs = await ClipSubmission.find({ proofs: { $exists: false } });

for (let sub of flatSubs) {
  // Build new proof object from flat fields
  const proof = {
    platform: sub.platform || '',
    submissionUrl: sub.submissionUrl || '',
    views: sub.views || 0,
    status: sub.status || 'pending',
    adminNote: sub.adminNote,
    lastVerified: sub.lastVerified,
    verifiedViews: sub.verifiedViews,
    rewardAmount: sub.rewardAmount || 0,
    proofVideo: sub.proofVideo,
    proofImage: sub.proofImage,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt
  };

  // Update the doc: set proofs, unset old flat fields
  await ClipSubmission.updateOne(
    { _id: sub._id },
    {
      $set: { proofs: [proof] },
      $unset: {
        platform: "",
        submissionUrl: "",
        views: "",
        status: "",
        adminNote: "",
        lastVerified: "",
        verifiedViews: "",
        rewardAmount: "",
        proofVideo: "",
        proofImage: ""
      }
    }
  );
  console.log('Migrated:', sub._id);
}

console.log('Migration complete!');
process.exit(0);
