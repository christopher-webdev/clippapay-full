// scripts/cleanupOldVideos.js
import mongoose from 'mongoose';
import ClipSubmission from '../models/ClipSubmission.js';
import fs from 'fs';
import path from 'path';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function cleanupOldVideos() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
    
    // Find proofs older than 30 days
    const submissions = await ClipSubmission.find({
      'proofs.createdAt': { $lt: thirtyDaysAgo }
    });

    let deletedCount = 0;
    
    for (const submission of submissions) {
      for (const proof of submission.proofs) {
        if (proof.createdAt < thirtyDaysAgo && proof.proofVideo) {
          try {
            // Delete the video file
            const filePath = path.join(process.cwd(), proof.proofVideo);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted old video: ${proof.proofVideo}`);
              deletedCount++;
            }
            
            // Remove the proof video reference (keep the record)
            proof.proofVideo = undefined;
          } catch (err) {
            console.error(`Error deleting video ${proof.proofVideo}:`, err);
          }
        }
      }
      await submission.save();
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} old video files.`);
  } catch (err) {
    console.error('Error in video cleanup:', err);
  }
}

// Run cleanup if this script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => cleanupOldVideos())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default cleanupOldVideos;