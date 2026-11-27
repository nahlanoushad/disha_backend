import express from 'express';

import {
    getColleges,
    getCollegeById,
    createCollege,
    updateCollege,
    deleteCollege
} from '../controllers/CollegeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all colleges
router.get('/', getColleges);

// Get one college by ID
router.get('/:id', getCollegeById);

// Create a new college (admin only)
router.post('/', protect, createCollege);

// Update a college (admin only)
router.put('/:id', protect, updateCollege);

// Delete a college (admin only)
router.delete('/:id', protect, deleteCollege);

export default router;
