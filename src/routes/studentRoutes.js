import express from 'express';
import * as studentController from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin protection for all student management routes
router.use(protect);

router.route('/')
  .get(studentController.getStudents);

router.route('/:id')
  .get(studentController.getStudent);

router.route('/:id/status')
  .patch(studentController.updateStudentStatus);

export default router;
