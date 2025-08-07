import express from 'express';
import Campaign from '../models/Campaign.js';
import ClipSubmission from '../models/ClipSubmission.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'
import fs from 'fs/promises';
import path from 'path';
import Wallet from '../models/Wallet.js';

const router = express.Router();

// --- GET ALL CAMPAIGNS (with stats) ---
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({})
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Could not fetch campaigns.' });
  }
});



router.get('/adworker-campaign', requireAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({})
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Could not fetch campaigns.' });
  }
});


router.put('/admin-campaigns/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Only allow updating specific fields
    const allowedUpdates = {
      title: updates.title,
      platforms: updates.platforms,
      hashtags: updates.hashtags,
      directions: updates.directions
    };
    
    const campaign = await Campaign.findByIdAndUpdate(
      id, 
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(400).json({ error: err.message });
  }
});




// routes/adminCampaigns.js

router.put('/adworker-campaign/:id',requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Only allow updating specific fields
    const allowedUpdates = {
      title: updates.title,
      platforms: updates.platforms,
      hashtags: updates.hashtags,
      directions: updates.directions
    };
    
    const campaign = await Campaign.findByIdAndUpdate(
      id, 
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(400).json({ error: err.message });
  }
});





// --- GET CAMPAIGN BY ID (details + submissions + proofs) ---
router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName');

    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    const submissions = await ClipSubmission.find({ campaign: campaign._id })
      .populate('clipper', 'email firstName lastName');
    res.json({ campaign, submissions });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch campaign.' });
  }
});

// --- UPDATE CAMPAIGN (PATCH) ---
router.patch('/:id', requireAdminAuth, async (req, res) => {
  try {
    const allowed = [
      'title', 'rate_per_1000', 'clipper_cpm', 'budget_total',
      'budget_remaining', 'views_purchased', 'views_left', 'platforms', 'status',
      'assignedWorker', 'adWorkerPercentage', 'adWorkerStatus', 'categories', 'countries', 'hashtags', 'directions', 'cta_url', 'numClipsSuggested'
    ];
    const update = {};
    for (let key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const updated = await Campaign.findByIdAndUpdate(
      req.params.id, update, { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not update campaign.' });
  }
});

// --- DELETE CAMPAIGN (and cascade delete related submissions & proofs, release escrow) ---
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    // 1. Release escrow for this campaign (budget_remaining)
    if (campaign.budget_remaining > 0) {
      const wallet = await Wallet.findOne({ user: campaign.advertiser });
      if (wallet) {
        try {
          await wallet.releaseEscrow(campaign.budget_remaining);
        } catch (err) {
          // If there's insufficient escrow, log but don't block campaign deletion
          console.warn('Error releasing escrow:', err.message);
        }
      }
    }

    // 2. Find all submissions
    const submissions = await ClipSubmission.find({ campaign: campaign._id });

    // 3. Remove related media (images/videos)
    for (const sub of submissions) {
      for (const proof of sub.proofs || []) {
        // You need to adjust file paths if stored locally
        if (proof.proofVideo) {
          try { await fs.unlink(path.resolve('uploads', proof.proofVideo)); } catch {}
        }
        if (proof.proofImage) {
          try { await fs.unlink(path.resolve('uploads', proof.proofImage)); } catch {}
        }
      }
    }

    // 4. Delete all related submissions
    await ClipSubmission.deleteMany({ campaign: campaign._id });

    // 5. Delete campaign
    await Campaign.deleteOne({ _id: campaign._id });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ error: 'Could not delete campaign.' });
  }
});

// --- CREATE NEW CAMPAIGN (POST) ---
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    // Accept all required fields!
    const c = new Campaign({ ...req.body });
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ error: 'Could not create campaign.' });
  }
});



// Correct an incorrect approval
router.post('/correct-approval', requireAdminAuth, async (req, res) => {
  try {
    const { userEmail, submissionId, proofId, correctViews } = req.body;

    // 1. Find the user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Find the submission (either by provided ID or search user's submissions)
    let submission;
    if (submissionId) {
      submission = await ClipSubmission.findById(submissionId)
        .populate('campaign clipper');
    } else {
      // Search all submissions by this user with approved proofs
      submission = await ClipSubmission.findOne({
        clipper: user._id,
        'proofs.status': 'approved'
      })
      .populate('campaign clipper')
      .sort({ createdAt: -1 }); // Get most recent first
    }

    if (!submission) {
      return res.status(404).json({ error: 'No approved submissions found for this user' });
    }

    // 3. Find the specific proof (either by provided ID or most recent approved)
    let proof;
    if (proofId) {
      proof = submission.proofs.id(proofId);
    } else {
      // Find the most recently approved proof
      proof = submission.proofs
        .filter(p => p.status === 'approved')
        .sort((a, b) => new Date(b.lastVerified) - new Date(a.lastVerified))[0];
    }

    if (!proof) {
      return res.status(404).json({ error: 'No approved proof found to correct' });
    }

    // 4. Get all wallets involved
    const campaign = await Campaign.findById(submission.campaign._id).populate('advertiser');
    const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id });
    const clipperWallet = await Wallet.findOne({ user: submission.clipper._id });
    
    // Find platform user and wallet
    let platformUser = await User.findOne({ role: 'platform' });
    if (!platformUser) {
      platformUser = await User.create({ 
        role: 'platform', 
        email: 'platform@clippapay.com', 
        passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN', 
        isSuperAdmin: false, 
        company: 'ClippaPay Platform' 
      });
    }
    const platformWallet = await Wallet.findOne({ user: platformUser._id }) || 
      await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

    // 5. Calculate amounts to reverse
    const CPM = campaign.clipper_cpm || 500;
    const platformCPM = PLATFORM_CPM || 700;
    
    const incorrectClipperAmount = proof.rewardAmount;
    const incorrectPlatformAmount = (proof.verifiedViews * platformCPM) / 1000;
    const totalToReverse = incorrectClipperAmount + incorrectPlatformAmount;

    // 6. Verify wallets have sufficient balance
    if (clipperWallet.balance < incorrectClipperAmount) {
      return res.status(400).json({ 
        error: `Clipper wallet has insufficient balance (${clipperWallet.balance} available, need ${incorrectClipperAmount})` 
      });
    }

    // 7. Perform the corrections
    // Reverse clipper payment
    clipperWallet.balance -= incorrectClipperAmount;
    await clipperWallet.save();

    // Reverse platform payment
    platformWallet.balance -= incorrectPlatformAmount;
    await platformWallet.save();

    // Return funds to advertiser's escrow
    advertiserWallet.escrowLocked += totalToReverse;
    await advertiserWallet.save();

    // 8. Update the proof record
    proof.status = 'rejected';
    proof.adminNote = `Corrected - originally approved in error for ${proof.verifiedViews} views`;
    
    // If correctViews was provided, create a new approved proof with correct views
    if (correctViews && correctViews > 0) {
      const correctClipperAmount = (correctViews * CPM) / 1000;
      const correctPlatformAmount = (correctViews * platformCPM) / 1000;
      const correctTotal = correctClipperAmount + correctPlatformAmount;

      // Verify advertiser has enough in escrow
      if (advertiserWallet.escrowLocked < correctTotal) {
        return res.status(400).json({ 
          error: `Advertiser has insufficient escrow (${advertiserWallet.escrowLocked} available, need ${correctTotal})` 
        });
      }

      // Create new correct proof
      submission.proofs.push({
        platform: proof.platform,
        submissionUrl: proof.submissionUrl,
        views: correctViews,
        proofVideo: proof.proofVideo,
        proofImage: proof.proofImage,
        status: 'approved',
        verifiedViews: correctViews,
        rewardAmount: correctClipperAmount,
        adminNote: 'Corrected approval',
        lastVerified: new Date()
      });

      // Deduct from advertiser escrow
      advertiserWallet.escrowLocked -= correctTotal;
      await advertiserWallet.save();

      // Pay clipper
      clipperWallet.balance += correctClipperAmount;
      await clipperWallet.save();

      // Pay platform
      platformWallet.balance += correctPlatformAmount;
      await platformWallet.save();

      // Update campaign metrics
      await campaign.deductViewsAndBudget(correctViews);
    }

    await submission.save();

    res.json({
      message: 'Correction completed successfully',
      correctionsMade: {
        reversedClipperAmount: incorrectClipperAmount,
        reversedPlatformAmount: incorrectPlatformAmount,
        newApprovalAmount: correctViews ? (correctViews * CPM) / 1000 : null,
        proofStatus: 'rejected',
        submissionId: submission._id,
        proofId: proof._id
      }
    });

  } catch (err) {
    console.error('Error correcting approval:', err);
    res.status(500).json({ error: 'Failed to correct approval', details: err.message });
  }
});

export default router;
