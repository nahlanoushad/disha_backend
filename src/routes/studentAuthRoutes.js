import express from 'express';
import {
  registerStudent,
  loginStudent,
  getStudentProfile,
  updateStudentProfile
} from '../controllers/auth/studentAuthController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/auth/register', registerStudent);
router.post('/auth/login', loginStudent);

// Protected routes
router.get('/profile', protectStudent, getStudentProfile);
router.put('/profile', protectStudent, updateStudentProfile);

export default router;
