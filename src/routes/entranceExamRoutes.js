import express from 'express';
import * as entranceExamController from '../controllers/entranceExamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', entranceExamController.getEntranceExams);
router.get('/:id', entranceExamController.getEntranceExam);

// Protected routes (Admin only)
router.use(protect);


router.post('/', entranceExamController.createEntranceExam);
router.put('/:id', entranceExamController.updateEntranceExam);
router.patch('/:id', entranceExamController.updateEntranceExam);
router.delete('/:id', entranceExamController.deleteEntranceExam);

export default router;
