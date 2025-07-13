import express from 'express';
import PlatformSetting from '../models/PlatformSetting.js';
import { requireAdminAuth } from '../middleware/adminAuth.js'


const router = express.Router();
router.get('/', requireAdminAuth, async (req, res, next) => {
  try {
    // fetch all five keys at once
    const docs = await PlatformSetting.find({
      key: {
        $in: [
          'bankName',
          'bankAccountNumber',
          'bankAccountName',
          'usdtAddress',
          'usdtNetwork',
        ]
      }
    });

    // start with defaults
    const settings = {
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
      usdtAddress: '',
      usdtNetwork: '',
    };

    // overwrite with whatever's in the DB
    docs.forEach(doc => {
      settings[doc.key] = doc.value;
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});


export default router;
