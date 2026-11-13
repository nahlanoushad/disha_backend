import express from 'express';
import {
  getTrackedExams,
  trackExam,
  updateTrackedExam,
  untrackExam,
  getExamReminders,
  triggerReminderCheck,
  getSchedulerStatus
} from '../controllers/studentExamController.js';
import { protectStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// All student examination routes require valid student JWT authentication
router.use('/tracked-exams', protectStudent);
router.use('/exam-reminders', protectStudent);

// Tracked exams endpoints
router.get('/tracked-exams', getTrackedExams);
router.post('/tracked-exams', trackExam);
router.put('/tracked-exams/:examId', updateTrackedExam);
router.patch('/tracked-exams/:examId', updateTrackedExam);
router.delete('/tracked-exams/:examId', untrackExam);

// Exam reminders endpoints
router.get('/exam-reminders', getExamReminders);
router.get('/exam-reminders/status', getSchedulerStatus);
router.post('/exam-reminders/check', triggerReminderCheck);

export default router;

