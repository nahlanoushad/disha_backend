import express from 'express';
import { updateLocation } from '../controllers/userController.js';
import { protectUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Update user location
router.put('/location', protectUser, updateLocation);

export default router;
