import express from 'express';
import {
  getQuestions,
  createAttempt,
  getAttempts,
  getLatestAttempt,
  getAttemptById,
  updateAttempt,
  submitAttempt,
  retryAiAnalysis
} from '../controllers/studentAptitudeController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - anyone can fetch assessment questions
router.get('/questions', getQuestions);

// All subsequent assessment attempt and result routes require valid student JWT authentication
router.use(protectStudent);

router.post('/attempts', createAttempt);
router.get('/attempts', getAttempts);
router.get('/attempts/latest', getLatestAttempt);
router.get('/attempts/:id', getAttemptById);
router.put('/attempts/:id', updateAttempt);
router.patch('/attempts/:id', updateAttempt);
router.post('/attempts/:id/submit', submitAttempt);
router.post('/attempts/:id/retry-ai', retryAiAnalysis);

export default router;

