import express from 'express';
import {
  registerDevice,
  deactivateDevice,
  testNotification
} from '../controllers/studentNotificationController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply student authentication middleware to all notification routes
router.use(protectStudent);

router.post('/register-device', registerDevice);
router.delete('/register-device', deactivateDevice);
router.post('/test', testNotification);

export default router;
