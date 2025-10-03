//admin route

import express from 'express';
import Campaign from '../models/Campaign.js';
import ClipSubmission from '../models/ClipSubmission.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'
import fs from 'fs/promises';
import path from 'path';
import Wallet from '../models/Wallet.js';

import multer from 'multer';
// File: express_backend/routes/adminCampaigns.js

const router = express.Router();
// Multer setup for PGC assets
const pgcAssetsDir = path.join(process.cwd(), 'uploads/pgc-assets');
await fs.mkdir(pgcAssetsDir, { recursive: true });

const pgcAssetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    console.log('Saving assets to:', pgcAssetsDir);
    cb(null, pgcAssetsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  },
});
const pgcAssetUpload = multer({
  storage: pgcAssetStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

// Utility to parse arrays
const parseArr = (val, fallback = []) => {
  try {
    if (val == null || val === '') return fallback;
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Extended PUT route
router.put(
  '/admin-campaigns/:id',
  pgcAssetUpload.array('assets'),
  requireAdminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('PUT /admin-campaigns/:id called', {
        files: req.files,
        body: req.body,
      });

      const campaign = await Campaign.findById(id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const allowedUpdates = {
        title: updates.title,
        platforms: updates.platforms ? parseArr(updates.platforms) : undefined,
        hashtags: updates.hashtags
          ? updates.hashtags.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        directions: updates.directions
          ? updates.directions.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        categories: updates.categories ? parseArr(updates.categories) : undefined,
        cta_url: updates.cta_url || undefined,
        'ugc.brief': updates.brief,
        'ugc.deliverables': updates.deliverables
          ? updates.deliverables.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        'ugc.captionTemplate': updates.captionTemplate,
        'ugc.usageRights': updates.usageRights,
        'ugc.approvalCriteria': updates.approvalCriteria,
      };

      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
      });

      Object.entries(allowedUpdates).forEach(([key, value]) => {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          campaign[parent] = campaign[parent] || {};
          campaign[parent][child] = value;
        } else {
          campaign[key] = value;
        }
      });

      if (campaign.kind === 'pgc') {
        if (campaign.ugc.brief === '') {
          return res.status(400).json({ error: 'Creative brief is required for PGC campaigns' });
        }
        if (campaign.ugc.approvalCriteria === '') {
          return res.status(400).json({ error: 'Approval criteria is required for PGC campaigns' });
        }
        if (campaign.categories && campaign.categories.length === 0) {
          return res.status(400).json({ error: 'At least one category is required for PGC campaigns' });
        }
      }

      if (req.files && req.files.length > 0) {
        const newAssets = req.files.map(file => `/uploads/pgc-assets/${file.filename}`);
        console.log('New assets to save:', newAssets);
        campaign.ugc = campaign.ugc || {};
        campaign.ugc.assets = [...(campaign.ugc.assets || []), ...newAssets];
      }

      let removeAssets = [];
      if (updates.removeAssets) {
        removeAssets = parseArr(updates.removeAssets);
        campaign.ugc = campaign.ugc || {};
        campaign.ugc.assets = campaign.ugc.assets.filter(asset => !removeAssets.includes(asset));
        for (const asset of removeAssets) {
          const filePath = path.resolve(
            asset.startsWith('/uploads/pgc-assets/')
              ? asset.replace('/uploads/pgc-assets/', 'Uploads/pgc-assets/')
              : asset.replace('/uploads/ugc-assets/', 'Uploads/ugc-assets/')
          );
          console.log('Removing asset:', filePath);
          try {
            await fs.unlink(filePath);
          } catch (unlinkErr) {
            console.warn(`Failed to delete asset ${asset}:`, unlinkErr);
          }
        }
      }

      await campaign.save();

      const updatedCampaign = await Campaign.findById(id)
        .populate('advertiser', 'email firstName lastName contactName company')
        .populate('assignedWorker', 'email firstName lastName');

      console.log('Updated campaign assets:', updatedCampaign.ugc?.assets);
      res.json(updatedCampaign);
    } catch (err) {
      console.error('Error updating campaign:', err);
      for (const f of req.files || []) {
        try {
          await fs.unlink(f.path);
        } catch {}
      }
      res.status(400).json({ error: err.message || 'Failed to update campaign' });
    }
  }
);

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

// routes/adminCampaigns.js
router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'email firstName lastName contactName company')
      .populate('assignedWorker', 'email firstName lastName');

    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    const submissions = await ClipSubmission.find({ campaign: campaign._id })
      .populate('clipper', 'email firstName lastName');

    // OPTIONAL: map asset paths to absolute URLs
    const toAbs = (p) => {
      if (!p) return p;
      if (p.startsWith('http')) return p;
      const host = req.get('host');
      const proto = req.protocol;
      return `${proto}://${host}${p}`;
    };
    const safe = campaign.toObject();
    if (safe?.ugc?.assets?.length) {
      safe.ugc.assets = safe.ugc.assets.map(toAbs);
    }

    res.json({ campaign: safe, submissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch campaign.' });
  }
});
// routes/campaigns.js
router.get('/:id/details', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('advertiser', 'contactName email')
      .populate('assignedWorker', 'contactName email');
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    const clips = await Clip.find({ campaign: campaign._id })
      .populate('adWorker', 'contactName email');

    const wallet = await Wallet.findOne({ user: campaign.advertiser._id });
    const stats = {
      clipsCount: clips.length,
      budgetUsed: campaign.budget_total - campaign.budget_remaining,
    };

    // map assets to absolute URLs (optional)
    const toAbs = (p) => {
      if (!p) return p;
      if (p.startsWith('http')) return p;
      const host = req.get('host');
      const proto = req.protocol;
      return `${proto}://${host}${p}`;
    };
    const safe = campaign.toObject();
    if (safe?.ugc?.assets?.length) {
      safe.ugc.assets = safe.ugc.assets.map(toAbs);
    }

    return res.json({ campaign: safe, clips, wallet, stats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
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

// REPLACE your existing /correct-approval with this:
router.post('/correct-approval', requireAdminAuth, async (req, res) => {
  try {
    const { userEmail, submissionId, proofId, correctViews } = req.body;

    // 1) Find clipper user
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2) Find submission
    let submission;
    if (submissionId) {
      submission = await ClipSubmission.findById(submissionId).populate('campaign clipper');
    } else {
      submission = await ClipSubmission.findOne({
        clipper: user._id,
        'proofs.status': 'approved'
      }).populate('campaign clipper').sort({ createdAt: -1 });
    }
    if (!submission) return res.status(404).json({ error: 'No approved submissions found for this user' });

    // 3) Find proof
    let proof = proofId ? submission.proofs.id(proofId) : null;
    if (!proof) {
      proof = submission.proofs
        .filter(p => p.status === 'approved')
        .sort((a,b) => new Date(b.lastVerified || b.updatedAt || b.createdAt) - new Date(a.lastVerified || a.updatedAt || a.createdAt))[0];
    }
    if (!proof) return res.status(404).json({ error: 'No approved proof found to correct' });

    // 4) Campaign + wallets
    const campaign = await Campaign.findById(submission.campaign._id).populate('advertiser');
    const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id });
    const clipperWallet    = await Wallet.findOne({ user: submission.clipper._id });
    if (!advertiserWallet || !clipperWallet) return res.status(400).json({ error: 'Wallet(s) not found' });
    const { platformUser, platformWallet } = await getOrCreatePlatformWallet();

    // CPMs from campaign (UGC: 5000/2000; normal: your defaults)
    const advCPM = campaign.rate_per_1000;
    const clipCPM= campaign.clipper_cpm;
    const platCPM= Math.max(0, advCPM - clipCPM);

    // 5) Reverse previous payment for this proof
    const paidViews = proof.verifiedViews || 0;
    const prevClipperAmt  = proof.rewardAmount || (paidViews * clipCPM) / 1000;
    const prevPlatformAmt = (paidViews * platCPM) / 1000;
    const totalReverse    = prevClipperAmt + prevPlatformAmt;

    if (clipperWallet.balance < prevClipperAmt) {
      return res.status(400).json({ error: `Clipper wallet insufficient for reversal` });
    }
    if (platformWallet.balance < prevPlatformAmt) {
      return res.status(400).json({ error: `Platform wallet insufficient for reversal` });
    }

    // Reverse to advertiser escrow
    clipperWallet.balance  -= prevClipperAmt;
    platformWallet.balance -= prevPlatformAmt;
    advertiserWallet.escrowLocked += totalReverse;

    await clipperWallet.save();
    await platformWallet.save();
    await advertiserWallet.save();

    // Log reversal transactions
    await Transaction.create({
      user: submission.clipper._id,
      type: 'debit',
      amount: prevClipperAmt,
      campaign: campaign._id,
      related_submission: submission._id,
      note: `Reversal of incorrect approval (${paidViews} views)`,
      rateSnapshot: clipCPM,
      proofId: proof._id,
      campaignKind: campaign.kind
    });
    if (prevPlatformAmt > 0) {
      await Transaction.create({
        user: platformUser._id,
        type: 'debit',
        amount: prevPlatformAmt,
        campaign: campaign._id,
        related_submission: submission._id,
        note: `Reversal of platform fee (${paidViews} views)`,
        rateSnapshot: platCPM,
        proofId: proof._id,
        campaignKind: campaign.kind
      });
    }
    await Transaction.create({
      user: campaign.advertiser._id,
      type: 'credit',
      amount: totalReverse,
      campaign: campaign._id,
      related_submission: submission._id,
      note: `Escrow refunded from correction (${paidViews} views)`,
      rateSnapshot: advCPM,
      proofId: proof._id,
      campaignKind: campaign.kind
    });

    // Mark the old proof rejected with note
    proof.status = 'rejected';
    proof.adminNote = `Corrected from ${paidViews} views`;
    await submission.save();

    // 6) If a correct view count is given, re-approve with correct values now
    let correction = null;
    if (Number.isFinite(Number(correctViews)) && Number(correctViews) > 0) {
      const newViews = Math.floor(Number(correctViews));
      const advCost  = (newViews * advCPM) / 1000;
      const clipAmt  = (newViews * clipCPM) / 1000;
      const platAmt  = (newViews * platCPM) / 1000;

      if (advertiserWallet.escrowLocked < advCost) {
        return res.status(400).json({ error: 'Insufficient advertiser escrow for corrected approval' });
      }

      // Release escrow and split
      await advertiserWallet.releaseEscrow(advCost);
      await clipperWallet.credit(clipAmt);
      if (platAmt > 0) await platformWallet.credit(platAmt);

      // Log corrected transactions
      await Transaction.create({
        user: campaign.advertiser._id,
        type: 'debit',
        amount: advCost,
        campaign: campaign._id,
        related_submission: submission._id,
        note: `Corrected charge for ${newViews} views`,
        rateSnapshot: advCPM,
        campaignKind: campaign.kind
      });
      await Transaction.create({
        user: submission.clipper._id,
        type: 'credit',
        amount: clipAmt,
        campaign: campaign._id,
        related_submission: submission._id,
        note: `Corrected earnings for ${newViews} views`,
        rateSnapshot: clipCPM,
        campaignKind: campaign.kind
      });
      if (platAmt > 0) {
        await Transaction.create({
          user: platformUser._id,
          type: 'credit',
          amount: platAmt,
          campaign: campaign._id,
          related_submission: submission._id,
          note: `Corrected platform fee for ${newViews} views`,
          rateSnapshot: platCPM,
          campaignKind: campaign.kind
        });
      }

      // Add a fresh approved proof entry to keep an audit trail
      submission.proofs.push({
        platform: proof.platform,
        submissionUrl: proof.submissionUrl,
        views: newViews,
        proofVideo: proof.proofVideo,
        proofImage: proof.proofImage,
        status: 'approved',
        verifiedViews: newViews,
        rewardAmount: clipAmt,
        adminNote: 'Corrected approval',
        lastVerified: new Date()
      });

      // Update campaign counters
      await campaign.deductViewsAndBudget(newViews);
      await submission.save();
      await campaign.save();

      correction = { newViews, advCost, clipAmt, platAmt };
    }

    return res.json({
      message: 'Correction completed',
      reversed: {
        clipper: prevClipperAmt,
        platform: prevPlatformAmt,
        total: totalReverse
      },
      correction
    });
  } catch (err) {
    console.error('Error correcting approval:', err);
    res.status(500).json({ error: 'Failed to correct approval', details: err.message });
  }
});


// Correct an incorrect approval
// router.post('/correct-approval', requireAdminAuth, async (req, res) => {
//   try {
//     const { userEmail, submissionId, proofId, correctViews } = req.body;

//     // 1. Find the user
//     const user = await User.findOne({ email: userEmail });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // 2. Find the submission (either by provided ID or search user's submissions)
//     let submission;
//     if (submissionId) {
//       submission = await ClipSubmission.findById(submissionId)
//         .populate('campaign clipper');
//     } else {
//       // Search all submissions by this user with approved proofs
//       submission = await ClipSubmission.findOne({
//         clipper: user._id,
//         'proofs.status': 'approved'
//       })
//       .populate('campaign clipper')
//       .sort({ createdAt: -1 }); // Get most recent first
//     }

//     if (!submission) {
//       return res.status(404).json({ error: 'No approved submissions found for this user' });
//     }

//     // 3. Find the specific proof (either by provided ID or most recent approved)
//     let proof;
//     if (proofId) {
//       proof = submission.proofs.id(proofId);
//     } else {
//       // Find the most recently approved proof
//       proof = submission.proofs
//         .filter(p => p.status === 'approved')
//         .sort((a, b) => new Date(b.lastVerified) - new Date(a.lastVerified))[0];
//     }

//     if (!proof) {
//       return res.status(404).json({ error: 'No approved proof found to correct' });
//     }

//     // 4. Get all wallets involved
//     const campaign = await Campaign.findById(submission.campaign._id).populate('advertiser');
//     const advertiserWallet = await Wallet.findOne({ user: campaign.advertiser._id });
//     const clipperWallet = await Wallet.findOne({ user: submission.clipper._id });
    
//     // Find platform user and wallet
//     let platformUser = await User.findOne({ role: 'platform' });
//     if (!platformUser) {
//       platformUser = await User.create({ 
//         role: 'platform', 
//         email: 'platform@clippapay.com', 
//         passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN', 
//         isSuperAdmin: false, 
//         company: 'ClippaPay Platform' 
//       });
//     }
//     const platformWallet = await Wallet.findOne({ user: platformUser._id }) || 
//       await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });

//     // 5. Calculate amounts to reverse
//     const CPM = campaign.clipper_cpm || 500;
//     const platformCPM = PLATFORM_CPM || 700;
    
//     const incorrectClipperAmount = proof.rewardAmount;
//     const incorrectPlatformAmount = (proof.verifiedViews * platformCPM) / 1000;
//     const totalToReverse = incorrectClipperAmount + incorrectPlatformAmount;

//     // 6. Verify wallets have sufficient balance
//     if (clipperWallet.balance < incorrectClipperAmount) {
//       return res.status(400).json({ 
//         error: `Clipper wallet has insufficient balance (${clipperWallet.balance} available, need ${incorrectClipperAmount})` 
//       });
//     }

//     // 7. Perform the corrections
//     // Reverse clipper payment
//     clipperWallet.balance -= incorrectClipperAmount;
//     await clipperWallet.save();

//     // Reverse platform payment
//     platformWallet.balance -= incorrectPlatformAmount;
//     await platformWallet.save();

//     // Return funds to advertiser's escrow
//     advertiserWallet.escrowLocked += totalToReverse;
//     await advertiserWallet.save();

//     // 8. Update the proof record
//     proof.status = 'rejected';
//     proof.adminNote = `Corrected - originally approved in error for ${proof.verifiedViews} views`;
    
//     // If correctViews was provided, create a new approved proof with correct views
//     if (correctViews && correctViews > 0) {
//       const correctClipperAmount = (correctViews * CPM) / 1000;
//       const correctPlatformAmount = (correctViews * platformCPM) / 1000;
//       const correctTotal = correctClipperAmount + correctPlatformAmount;

//       // Verify advertiser has enough in escrow
//       if (advertiserWallet.escrowLocked < correctTotal) {
//         return res.status(400).json({ 
//           error: `Advertiser has insufficient escrow (${advertiserWallet.escrowLocked} available, need ${correctTotal})` 
//         });
//       }

//       // Create new correct proof
//       submission.proofs.push({
//         platform: proof.platform,
//         submissionUrl: proof.submissionUrl,
//         views: correctViews,
//         proofVideo: proof.proofVideo,
//         proofImage: proof.proofImage,
//         status: 'approved',
//         verifiedViews: correctViews,
//         rewardAmount: correctClipperAmount,
//         adminNote: 'Corrected approval',
//         lastVerified: new Date()
//       });

//       // Deduct from advertiser escrow
//       advertiserWallet.escrowLocked -= correctTotal;
//       await advertiserWallet.save();

//       // Pay clipper
//       clipperWallet.balance += correctClipperAmount;
//       await clipperWallet.save();

//       // Pay platform
//       platformWallet.balance += correctPlatformAmount;
//       await platformWallet.save();

//       // Update campaign metrics
//       await campaign.deductViewsAndBudget(correctViews);
//     }

//     await submission.save();

//     res.json({
//       message: 'Correction completed successfully',
//       correctionsMade: {
//         reversedClipperAmount: incorrectClipperAmount,
//         reversedPlatformAmount: incorrectPlatformAmount,
//         newApprovalAmount: correctViews ? (correctViews * CPM) / 1000 : null,
//         proofStatus: 'rejected',
//         submissionId: submission._id,
//         proofId: proof._id
//       }
//     });

//   } catch (err) {
//     console.error('Error correcting approval:', err);
//     res.status(500).json({ error: 'Failed to correct approval', details: err.message });
//   }
// });
/**
 * POST /admin/campaigns/:id/status
 * body: { status: 'active'|'paused'|'completed'|'cancelled' }
 */
router.post('/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active','paused','completed','cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    campaign.status = status;
    await campaign.save();
    return res.json(campaign);
  } catch (err) {
    console.error('status change error:', err);
    res.status(500).json({ error: 'Failed to change status' });
  }
});
/**
 * POST /admin/campaigns/:campaignId/submissions/:submissionId/proofs/:proofId/approve
 * body: { verifiedViews: number }  // total verified views to date (we pay only the delta)
 */
router.post(
  '/:campaignId/submissions/:submissionId/proofs/:proofId/approve',
  requireAdminAuth,
  async (req, res) => {
    try {
      const { campaignId, submissionId, proofId } = req.params;
      const { verifiedViews } = req.body;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const submission = await ClipSubmission.findById(submissionId).populate('clipper');
      if (!submission || String(submission.campaign) !== String(campaign._id)) {
        return res.status(404).json({ error: 'Submission not found for this campaign' });
      }
      const proof = submission.proofs.id(proofId);
      if (!proof) return res.status(404).json({ error: 'Proof not found' });

      const newVerifiedViews = Math.max(0, Number(verifiedViews || 0));
      const prevVerified = proof.verifiedViews || 0;
      const delta = Math.max(0, newVerifiedViews - prevVerified);
      if (delta === 0) {
        // still update status and timestamps if needed
        proof.status = 'approved';
        proof.verifiedViews = newVerifiedViews;
        proof.lastVerified = new Date();
        await submission.save();
        return res.json({ message: 'No new views to pay. Proof status updated.', deltaViews: 0 });
      }

      // Economics from campaign (works for UGC and normal)
      const advertiserCpm = campaign.rate_per_1000; // e.g. 5000 for UGC
      const clipperCpm    = campaign.clipper_cpm;   // e.g. 2000 for UGC
      const advertiserCost = (delta * advertiserCpm) / 1000;
      const clipperPay     = (delta * clipperCpm) / 1000;
      const platformFee    = Math.max(0, advertiserCost - clipperPay);

      // Wallets
      const advWallet = await Wallet.findOne({ user: campaign.advertiser });
      if (!advWallet) return res.status(400).json({ error: 'Advertiser wallet not found' });
      const clipWallet = await Wallet.findOne({ user: submission.clipper._id });
      if (!clipWallet) return res.status(400).json({ error: 'Clipper wallet not found' });

      const { platformUser, platformWallet } = await getOrCreatePlatformWallet();

      // Ensure escrow covers full advertiser cost
      if (advWallet.escrowLocked < advertiserCost) {
        return res.status(400).json({ error: 'Insufficient advertiser escrow for approval' });
      }

      // Release full cost from escrow, then split
      await advWallet.releaseEscrow(advertiserCost);
      await clipWallet.credit(clipperPay);
      if (platformFee > 0) await platformWallet.credit(platformFee);

      // Transactions (debit advertiser, credit clipper, credit platform)
      await Transaction.create({
        user: campaign.advertiser,
        type: 'debit',
        amount: advertiserCost,
        campaign: campaign._id,
        related_submission: submission._id,
        note: `Charge for ${delta} verified views @ ₦${advertiserCpm}/k`,
        rateSnapshot: advertiserCpm,
        proofId: proof._id,
        campaignKind: campaign.kind
      });
      await Transaction.create({
        user: submission.clipper._id,
        type: 'credit',
        amount: clipperPay,
        campaign: campaign._id,
        related_submission: submission._id,
        note: `Earnings for ${delta} verified views @ ₦${clipperCpm}/k`,
        rateSnapshot: clipperCpm,
        proofId: proof._id,
        campaignKind: campaign.kind
      });
      if (platformFee > 0) {
        await Transaction.create({
          user: platformUser._id,
          type: 'credit',
          amount: platformFee,
          campaign: campaign._id,
          related_submission: submission._id,
          note: `Platform fee for ${delta} verified views`,
          rateSnapshot: advertiserCpm - clipperCpm,
          proofId: proof._id,
          campaignKind: campaign.kind
        });
      }

      // Update proof/submission/campaign
      proof.verifiedViews = newVerifiedViews;
      proof.lastVerified  = new Date();
      proof.status        = 'approved';
      proof.rewardAmount  = (proof.rewardAmount || 0) + clipperPay;

      submission.rewardAmount = (submission.rewardAmount || 0) + clipperPay;

      await campaign.deductViewsAndBudget(delta);
      await submission.save();
      await campaign.save();

      return res.json({
        ok: true,
        deltaViews: delta,
        advertiserCost,
        clipperPay,
        platformFee
      });
    } catch (err) {
      console.error('approve proof error:', err);
      return res.status(500).json({ error: 'Failed to approve proof', details: err.message });
    }
  }
);

export default router;
