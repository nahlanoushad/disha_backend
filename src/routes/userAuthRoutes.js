import express from 'express';
import { registerUser, loginUser, verifyOTP, resendOTP } from '../controllers/auth/userauthController.js';

const router = express.Router();

// Student registration (generates OTP)
router.post('/register', registerUser);

// Student OTP verification
router.post('/verify-otp', verifyOTP);

// Student Resend OTP
router.post('/resend-otp', resendOTP);

// Student login
router.post('/login', loginUser);

export default router;
