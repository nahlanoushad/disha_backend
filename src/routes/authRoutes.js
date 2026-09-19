import express from 'express';
import { loginAdmin, getMe } from '../controllers/auth/adminauthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin login route
router.post('/login', loginAdmin);

// Current admin profile route
router.get('/me', protect, getMe);

export default router;