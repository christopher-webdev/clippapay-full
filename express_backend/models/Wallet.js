// File: express_backend/models/Wallet.js

import mongoose from 'mongoose';

// Wallet schema: tracks available vs. escrow-locked funds for each user
const walletSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // amount the user can spend or withdraw
  balance:      { type: Number, default: 0 },
  // funds reserved to pay clippers for active campaigns
  escrowLocked: { type: Number, default: 0 },
}, { timestamps: true });

/** 
 * Credit available balance.
 * @param {number} amount
 */
walletSchema.methods.credit = function(amount) {
  this.balance += amount;
  return this.save();
};

/** 
 * Debit available balance.
 * @param {number} amount
 * @throws if insufficient available funds
 */
walletSchema.methods.debit = function(amount) {
  if (amount > this.balance) throw new Error('Insufficient funds');
  this.balance -= amount;
  return this.save();
};

/**
 * Move funds into escrow.
 * @param {number} amount
 * @throws if amount > available
 */
walletSchema.methods.lockEscrow = function(amount) {
  if (amount > this.balance) throw new Error('Insufficient available funds');
  this.balance       -= amount;
  this.escrowLocked  += amount;
  return this.save();
};

/**
 * Release funds from escrow back to available.
 * @param {number} amount
 * @throws if amount > escrowLocked
 */
walletSchema.methods.releaseEscrow = function(amount) {
  if (amount > this.escrowLocked) throw new Error('Insufficient escrow funds');
  this.escrowLocked -= amount;
  this.balance      += amount;
  return this.save();
};

export default mongoose.model('Wallet', walletSchema);
