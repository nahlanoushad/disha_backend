import express from 'express';
import {
  registerStudent,
  loginStudent,
  verifyStudentEmail,
  resendStudentOtp,
  getStudentProfile,
  updateStudentProfile
} from '../controllers/auth/studentAuthController.js';
import {
  getStudentLocation,
  updateStudentLocation,
  searchLocation,
  reverseGeocode
} from '../controllers/studentLocationController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/auth/register', registerStudent);
router.post('/auth/verify-otp', verifyStudentEmail);
router.post('/auth/resend-otp', resendStudentOtp);
router.post('/auth/login', loginStudent);

// Protected profile routes
router.get('/profile', protectStudent, getStudentProfile);
router.put('/profile', protectStudent, updateStudentProfile);

// Protected location routes
router.get('/location', protectStudent, getStudentLocation);
router.put('/location', protectStudent, updateStudentLocation);
router.get('/location/search', protectStudent, searchLocation);
router.get('/location/reverse', protectStudent, reverseGeocode);

export default router;
