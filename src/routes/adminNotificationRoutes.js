import express from 'express';
import {
  sendBroadcast,
  getNotifications,
  deleteNotification
} from '../controllers/adminNotificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin only
router.use(protect);

router.get('/', getNotifications);
router.post('/send', sendBroadcast);
router.delete('/:id', deleteNotification);

export default router;
