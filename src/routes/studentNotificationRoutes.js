import express from 'express';
import {
  registerDevice,
  deactivateDevice,
  testNotification
} from '../controllers/studentNotificationController.js';
import { getMyNotifications, markNotificationsSeen } from '../controllers/studentInboxController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply student authentication middleware to all notification routes
router.use(protectStudent);

router.get('/', getMyNotifications);
router.post('/seen', markNotificationsSeen);
router.post('/register-device', registerDevice);
router.delete('/register-device', deactivateDevice);
router.post('/test', testNotification);

export default router;
