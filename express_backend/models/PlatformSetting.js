// File: express_backend/models/PlatformSetting.js

import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    enum: [
      'bankName', 
      'bankAccountNumber', 
      'bankAccountName',
      'usdtAddress',
      'usdtNetwork',
      'usdtMinDeposit',
      'usdtMinWithdrawal',
      'ngnMinDeposit',
      'ngnMinWithdrawal',
      'usdtRate' // NGN per 1 USDT
    ]
  },
  value: { type: String, required: true },
  description: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('PlatformSetting', platformSettingSchema);