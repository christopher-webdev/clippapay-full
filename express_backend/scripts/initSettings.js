// File: express_backend/scripts/initSettings.js

import PlatformSetting from '../models/PlatformSetting.js';

export async function initializePlatformSettings() {
  const defaultSettings = [
    { key: 'bankName', value: 'Kuda Microfinance Bank', description: 'Bank name for deposits' },
    { key: 'bankAccountNumber', value: '3002830057', description: 'Bank account number' },
    { key: 'bankAccountName', value: 'Clippa Digital Hub LTD', description: 'Bank account name' },
    { key: 'usdtAddress', value: 'TXmz7jY7yY9Zy9Zy9Zy9Zy9Zy9Zy9Zy9Zy9', description: 'USDT wallet address' },
    { key: 'usdtNetwork', value: 'TRC20', description: 'USDT network (TRC20/ERC20/BEP20)' },
    { key: 'usdtMinDeposit', value: '10', description: 'Minimum USDT deposit' },
    { key: 'usdtMinWithdrawal', value: '5', description: 'Minimum USDT withdrawal' },
    { key: 'ngnMinDeposit', value: '20000', description: 'Minimum NGN deposit' },
    { key: 'ngnMinWithdrawal', value: '1000', description: 'Minimum NGN withdrawal' },
    { key: 'usdtRate', value: '1500', description: 'NGN per 1 USDT exchange rate' }
  ];

  for (const setting of defaultSettings) {
    await PlatformSetting.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true }
    );
  }

  console.log('✅ Platform settings initialized');
}