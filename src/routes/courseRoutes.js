import express from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} from '../controllers/courseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllCourses)
  .post(protect, createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(protect, updateCourse)
  .patch(protect, updateCourse)
  .delete(protect, deleteCourse);

export default router;
