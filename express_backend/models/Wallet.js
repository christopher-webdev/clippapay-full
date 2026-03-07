// File: express_backend/models/Wallet.js

import mongoose from 'mongoose';

// Wallet schema: tracks available vs. escrow-locked funds for both NGN and USDT
const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // NGN balances
  balance: { type: Number, default: 0 },
  escrowLocked: { type: Number, default: 0 },
  
  // USDT balances
  usdtBalance: { type: Number, default: 0 },
  usdtEscrowLocked: { type: Number, default: 0 },
  
  // Optional: Store preferred withdrawal method
  preferredCurrency: { type: String, enum: ['NGN', 'USDT'], default: 'NGN' }
}, { timestamps: true });

/** 
 * Credit NGN available balance.
 * @param {number} amount
 */
walletSchema.methods.creditNGN = function(amount) {
  this.balance += amount;
  return this.save();
};

/** 
 * Credit USDT available balance.
 * @param {number} amount
 */
walletSchema.methods.creditUSDT = function(amount) {
  this.usdtBalance += amount;
  return this.save();
};

/** 
 * Debit NGN available balance.
 * @param {number} amount
 * @throws if insufficient available funds
 */
walletSchema.methods.debitNGN = function(amount) {
  if (amount > this.balance) throw new Error('Insufficient NGN funds');
  this.balance -= amount;
  return this.save();
};

/** 
 * Debit USDT available balance.
 * @param {number} amount
 * @throws if insufficient available funds
 */
walletSchema.methods.debitUSDT = function(amount) {
  if (amount > this.usdtBalance) throw new Error('Insufficient USDT funds');
  this.usdtBalance -= amount;
  return this.save();
};

/**
 * Move NGN funds into escrow.
 * @param {number} amount
 * @throws if amount > available
 */
walletSchema.methods.lockEscrowNGN = function(amount) {
  if (amount > this.balance) throw new Error('Insufficient available NGN funds');
  this.balance -= amount;
  this.escrowLocked += amount;
  return this.save();
};

/**
 * Move USDT funds into escrow.
 * @param {number} amount
 * @throws if amount > available
 */
walletSchema.methods.lockEscrowUSDT = function(amount) {
  if (amount > this.usdtBalance) throw new Error('Insufficient available USDT funds');
  this.usdtBalance -= amount;
  this.usdtEscrowLocked += amount;
  return this.save();
};

/**
 * Release NGN funds from escrow back to available.
 * @param {number} amount
 * @throws if amount > escrowLocked
 */
walletSchema.methods.releaseEscrowNGN = function(amount) {
  if (amount > this.escrowLocked) throw new Error('Insufficient NGN escrow funds');
  this.escrowLocked -= amount;
  this.balance += amount;
  return this.save();
};

/**
 * Release USDT funds from escrow back to available.
 * @param {number} amount
 * @throws if amount > usdtEscrowLocked
 */
walletSchema.methods.releaseEscrowUSDT = function(amount) {
  if (amount > this.usdtEscrowLocked) throw new Error('Insufficient USDT escrow funds');
  this.usdtEscrowLocked -= amount;
  this.usdtBalance += amount;
  return this.save();
};

export default mongoose.model('Wallet', walletSchema);