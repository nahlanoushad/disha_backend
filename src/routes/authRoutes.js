import express from 'express';
import { loginAdmin, getMe } from '../controllers/auth/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin login route
router.post('/login', loginAdmin);

// Current admin profile route (protected)
router.get('/me', protect, getMe);

export default router;
