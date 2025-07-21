// File: express_backend/routes/auth.js

import express from 'express';
import User from '../models/User.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Nodemailer setup
// Nodemailer (Spacemail) transport with defaults
const transporter = nodemailer.createTransport(
  {
    host: 'mail.spacemail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,   // reach@clippapay.com
      pass: process.env.SMTP_PASS,
    },
  },
  {
    
    from: '"ClippaPay" <reach@clippapay.com>',
  }
);


// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const validateCreatorTypes = (req, res, next) => {
  if (req.body.role === 'advertiser' && (!req.body.creatorTypes || req.body.creatorTypes.length === 0)) {
    return res.status(400).json({ error: 'At least one creator type must be selected' });
  }
  next();
};


router.post('/signup', async (req, res) => {
  try {
    const { 
      role, 
      email, 
      password, 
      confirm, 
      phone, 
      country, 
      firstName, 
      lastName, 
      contactName, 
      company,
      creatorTypes = [],
      otherCreatorType = ''
    } = req.body;

    // Validation checks
    if (password !== confirm) return res.status(400).json({ error: 'Passwords must match.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short.' });

    // Handle "Other" creator type
    const finalCreatorTypes = creatorTypes.includes("Other (please specify)")
      ? [...creatorTypes.filter(type => type !== "Other (please specify)"), otherCreatorType]
      : creatorTypes;

    // Check if advertiser selected at least one creator type
    if (role === 'advertiser' && finalCreatorTypes.length === 0) {
      return res.status(400).json({ error: 'Please select at least one creator type.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      if (!existing.isVerified) {
        // Resend OTP
        const otp = generateOTP();
        existing.emailOTP = otp;
        existing.otpExpires = Date.now() + 30 * 60 * 1000;
        await existing.save();
        await transporter.sendMail({
          to: "chrisnwok@gmail.com",
          subject: 'Your ClippaPay Verification Code (Resent)',
          text: `Your new code is ${otp}. It expires in 30 minutes.`,
        });
        return res.json({ message: 'Email already registered but not verified. OTP resent.' });
      }
      return res.status(400).json({ error: 'Email already in use.' });
    }

    // Create new unverified user
    const user = new User({ role, email, phone, country });
    if (role === 'clipper') {
      Object.assign(user, { firstName, lastName });
    } else {
      Object.assign(user, { 
        contactName, 
        company,
        creatorTypes: finalCreatorTypes,
        otherCreatorType: finalCreatorTypes.includes(otherCreatorType) ? otherCreatorType : ''
      });
    }
    
    await user.setPassword(password);

    // Store OTP
    const otp = generateOTP();
    user.emailOTP = otp;
    user.otpExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: '"ClippaPay" <reach@clippapay.com>',
      to: email,
      subject: 'Your ClippaPay Verification Code',
      text: `Your code is ${otp}. It expires in 30 minutes.`,
    });

    res.json({ message: 'OTP sent—please check your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});


// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email.' });
    if (user.isVerified) return res.json({ message: 'Already verified.' });
    if (Date.now() > user.otpExpires) return res.status(400).json({ error: 'Code expired. Please sign up again.' });
    if (otp !== user.emailOTP) return res.status(400).json({ error: 'Wrong code.' });

    user.isVerified = true;
    user.emailOTP   = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Verified successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Unknown email.' });
    if (user.isVerified) return res.status(400).json({ error: 'Account already verified.' });

    const otp = generateOTP();
    user.emailOTP   = otp;
    user.otpExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      to: email,
      subject: 'Your ClippaPay Verification Code (Resent)',
      text: `Your new code is ${otp}. It expires in 30 minutes.`,
    });

    res.json({ message: 'OTP resent—please check your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // 1) Must exist
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // 2) Blocked check
    if (user.isBlocked) {
      return res.status(403).json({
        error: 'Your account is blocked. Please contact support for more information.'
      });
    }

    // 3) If not an ad-worker, must be verified
    if (user.role !== 'ad-worker' && !user.isVerified) {
      return res.status(400).json({ error: 'Account not verified.' });
    }

    // 4) Password check
    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // 5) Pick a display name
    let name;
    switch (user.role) {
      case 'clipper':
        name = `${user.firstName} ${user.lastName}`;
        break;
      case 'advertiser':
        name = user.contactName;
        break;
      case 'ad-worker':
        name = `Ad Worker (${user.email})`;
        break;
      default:
        name = user.email;
    }

    // 6) Sign the token
    const token = jwt.sign(
      { id: user._id, role: user.role, name, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 7) Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 8) Send response
    return res.json({ message: 'Logged in successfully.', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'No account with that email.' });

    const resetCode = generateOTP(); // e.g. '363580'
    user.resetCode = resetCode;
    user.resetExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    await transporter.sendMail({
      to: "chrisnwok@gmail.com",
      subject: 'Reset your ClippaPay password',
      text: `Your reset code is ${resetCode}. It will expire in 15 minutes.`,
    });

    res.json({ message: 'Reset code sent to email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.resetCode !== code || Date.now() > user.resetExpires) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }

    await user.setPassword(newPassword);
    user.resetCode = undefined;
    user.resetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

