import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllCategories)
  .post(protect, createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(protect, updateCategory)
  .patch(protect, updateCategory)
  .delete(protect, deleteCategory);

export default router;
