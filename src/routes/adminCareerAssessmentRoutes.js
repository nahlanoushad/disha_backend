import express from 'express';
import {
  getAdminQuestions,
  createAdminQuestion,
  getAdminQuestionById,
  updateAdminQuestion,
  deleteAdminQuestion,
  updateQuestionStatus,
  publishQuestionSet,
  previewQuestionSet
} from '../controllers/adminCareerAssessmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes - Admin only
router.use(protect);

router
  .route('/questions')
  .get(getAdminQuestions)
  .post(createAdminQuestion);

router.post('/publish', publishQuestionSet);
router.get('/preview', previewQuestionSet);

router
  .route('/questions/:id')
  .get(getAdminQuestionById)
  .put(updateAdminQuestion)
  .delete(deleteAdminQuestion);

router.patch('/questions/:id/status', updateQuestionStatus);

export default router;
