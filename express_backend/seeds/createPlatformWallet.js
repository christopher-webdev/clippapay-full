// seed/createPlatformWallet.js

import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

export async function ensurePlatformWallet() {
  let platformUser = await User.findOne({ role: 'platform' });
  if (!platformUser) {
    platformUser = await User.create({
      role: 'platform',
      email: 'platform@clippapay.com',
      passwordHash: 'PLATFORM_USER_DOES_NOT_LOGIN',
      isSuperAdmin: false,
      company: 'ClippaPay Platform',
    });
  }
  let platformWallet = await Wallet.findOne({ user: platformUser._id });
  if (!platformWallet) {
    platformWallet = await Wallet.create({ user: platformUser._id, balance: 0, escrowLocked: 0 });
  }
  platformUser.wallet = platformWallet._id;
  await platformUser.save();
  console.log('Platform user and wallet ensured.');
}
