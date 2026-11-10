import express from 'express';

import {
    getColleges,
    getCollegeById,
    createCollege,
    updateCollege,
    deleteCollege
} from '../controllers/CollegeController.js';

const router = express.Router();

// Get all colleges
router.get('/', getColleges);

// Get one college by ID
router.get('/:id', getCollegeById);

// Create a new college
router.post('/', createCollege);

// Update a college
router.put('/:id', updateCollege);

// Delete a college
router.delete('/:id', deleteCollege);

export default router;
