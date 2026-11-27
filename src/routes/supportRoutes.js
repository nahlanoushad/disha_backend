import express from 'express';
import {
    createSupportRequest,
    getSupportRequests,
    updateSupportRequestStatus
} from '../controllers/supportController.js';
import { protectStudent, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Student: submit a support request
router.post('/', protectStudent, createSupportRequest);

// Admin: get all support requests
router.get('/', protect, getSupportRequests);

// Admin: update request status
router.patch('/:id/status', protect, updateSupportRequestStatus);

export default router;

