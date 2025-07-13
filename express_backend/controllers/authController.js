import express from 'express';
import User from '../models/User.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) return res.status(400).json({ error: 'Invalid credentials or account not verified.' });
    const valid = await user.validatePassword(password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Logged in successfully.', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { role, email, password, confirm, phone, country, firstName, lastName, dob, contactName, company } = req.body;
    if (password !== confirm) return res.status(400).json({ error: 'Passwords must match.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short.' });

    let user = await User.findOne({ email });
    if (user) {
      if (!user.isVerified) {
        const otp = generateOTP();
        user.emailOTP = otp;
        user.otpExpires = Date.now() + 30 * 60 * 1000;
        await user.save();
        await transporter.sendMail({
          to: email,
          subject: 'ClippaPay Verification Code (Resent)',
          text: `Your new code is ${otp}. It expires in 30 minutes.`
        });
        return res.json({ message: 'Account exists but not verified. OTP resent.' });
      }
      return res.status(400).json({ error: 'Email already in use.' });
    }
    user = new User({ role, email, phone, country });
    if (role === 'clipper') Object.assign(user, { firstName, lastName, dob: dob ? new Date(dob) : null });
    else Object.assign(user, { contactName, company });
    await user.setPassword(password);
    const otp = generateOTP();
    user.emailOTP = otp;
    user.otpExpires = Date.now() + 30 * 60 * 1000;
    await user.save();
    await transporter.sendMail({
      to: email,
      subject: 'ClippaPay Verification Code',
      text: `Your code is ${otp}. It expires in 30 minutes.`
    });
    res.json({ message: 'Signup successful. OTP sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email.' });
    if (user.isVerified) {
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      return res.status(200).json({ message: 'Already verified.', token });
    }
    if (Date.now() > user.otpExpires) {
      const newOtp = generateOTP();
      user.emailOTP = newOtp;
      user.otpExpires = Date.now() + 30 * 60 * 1000;
      await user.save();
      await transporter.sendMail({
        to: email,
        subject: 'ClippaPay Verification Code (Resent)',
        text: `Your new code is ${newOtp}. It expires in 30 minutes.`
      });
      return res.status(400).json({ error: 'Code expired. New OTP sent.' });
    }
    if (otp !== user.emailOTP) return res.status(400).json({ error: 'Incorrect code.' });
    user.isVerified = true;
    user.emailOTP = undefined;
    user.otpExpires = undefined;
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ message: 'Verified successfully.', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
