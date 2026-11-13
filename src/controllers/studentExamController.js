import TrackedExam from '../models/TrackedExam.js';
import EntranceExam from '../models/EntranceExam.js';
import ReminderDelivery from '../models/ReminderDelivery.js';
import AppError from '../utils/appError.js';
import { computeExamStatus } from '../utils/examDateHelper.js';
import { reminderSchedulerService } from '../services/reminderSchedulerService.js';
import mongoose from 'mongoose';

/**
 * Get all tracked exams for authenticated student
 * GET /api/student/tracked-exams
 */
export const getTrackedExams = async (req, res, next) => {
  try {
    const studentId = req.student._id;

    const tracked = await TrackedExam.find({ studentId })
      .populate('examId')
      .sort({ createdAt: -1 })
      .lean();

    // Attach computedStatus to each tracked exam
    const results = tracked
      .filter((t) => t.examId) // filter out deleted exams
      .map((t) => ({
        ...t,
        exam: {
          ...t.examId,
          computedStatus: computeExamStatus(t.examId)
        }
      }));

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: {
        trackedExams: results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track an entrance exam
 * POST /api/student/tracked-exams
 */
export const trackExam = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { examId, reminderOffsets, selectedEventTypes, notificationChannels, notes } = req.body;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return next(new AppError('Valid exam ID is required', 400));
    }

    const exam = await EntranceExam.findById(examId);
    if (!exam) {
      return next(new AppError('Entrance Exam not found', 404));
    }

    // Check if already tracked
    let tracked = await TrackedExam.findOne({ studentId, examId });

    if (tracked) {
      // Update existing tracking preferences
      if (reminderOffsets) tracked.reminderOffsets = reminderOffsets;
      if (selectedEventTypes) tracked.selectedEventTypes = selectedEventTypes;
      if (notificationChannels) tracked.notificationChannels = notificationChannels;
      if (notes !== undefined) tracked.notes = notes;
      await tracked.save();
    } else {
      tracked = await TrackedExam.create({
        studentId,
        examId,
        reminderOffsets: reminderOffsets || [7, 3, 1, 0],
        selectedEventTypes: selectedEventTypes || ['application_closing', 'admit_card_release', 'examination', 'result'],
        notificationChannels: notificationChannels || { push: true, sms: false },
        notes: notes || ''
      });
    }

    const populated = await TrackedExam.findById(tracked._id).populate('examId').lean();

    res.status(201).json({
      status: 'success',
      message: 'Exam tracked successfully',
      data: {
        trackedExam: {
          ...populated,
          exam: {
            ...populated.examId,
            computedStatus: computeExamStatus(populated.examId)
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tracking preferences for an exam
 * PUT /api/student/tracked-exams/:examId
 */
export const updateTrackedExam = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { examId } = req.params;
    const { reminderOffsets, selectedEventTypes, notificationChannels, notes } = req.body;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return next(new AppError('Valid exam ID is required', 400));
    }

    const tracked = await TrackedExam.findOne({ studentId, examId });
    if (!tracked) {
      return next(new AppError('Tracked exam record not found for this student', 404));
    }

    if (reminderOffsets !== undefined && Array.isArray(reminderOffsets)) {
      tracked.reminderOffsets = reminderOffsets;
    }
    if (selectedEventTypes !== undefined && Array.isArray(selectedEventTypes)) {
      tracked.selectedEventTypes = selectedEventTypes;
    }
    if (notificationChannels !== undefined && typeof notificationChannels === 'object') {
      tracked.notificationChannels = {
        ...tracked.notificationChannels,
        ...notificationChannels
      };
    }
    if (notes !== undefined) {
      tracked.notes = notes;
    }

    await tracked.save();
    const populated = await TrackedExam.findById(tracked._id).populate('examId').lean();

    res.status(200).json({
      status: 'success',
      message: 'Reminder preferences updated successfully',
      data: {
        trackedExam: {
          ...populated,
          exam: {
            ...populated.examId,
            computedStatus: computeExamStatus(populated.examId)
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Untrack an entrance exam
 * DELETE /api/student/tracked-exams/:examId
 */
export const untrackExam = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { examId } = req.params;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return next(new AppError('Valid exam ID is required', 400));
    }

    const result = await TrackedExam.findOneAndDelete({ studentId, examId });
    if (!result) {
      return next(new AppError('Tracked exam record not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Exam removed from tracking list'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get history of reminders dispatched for authenticated student
 * GET /api/student/exam-reminders
 */
export const getExamReminders = async (req, res, next) => {
  try {
    const studentId = req.student._id;

    const deliveries = await ReminderDelivery.find({ studentId })
      .populate('examId', 'name conductingAuthority')
      .sort({ sentAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      status: 'success',
      results: deliveries.length,
      data: {
        reminders: deliveries
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger scheduled reminder check on-demand
 * POST /api/student/exam-reminders/check
 */
export const triggerReminderCheck = async (req, res, next) => {
  try {
    const result = await reminderSchedulerService.checkAndDispatchReminders();
    res.status(200).json({
      status: 'success',
      message: 'Reminder dispatch cycle executed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current background scheduler status
 * GET /api/student/exam-reminders/status
 */
export const getSchedulerStatus = async (req, res, next) => {
  try {
    const status = reminderSchedulerService.getStatus();
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

