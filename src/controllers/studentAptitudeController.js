import AptitudeQuestion from '../models/AptitudeQuestion.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Student from '../models/Student.js';
import AppError from '../utils/appError.js';
import { aptitudeScoringService } from '../services/aptitudeScoringService.js';
import { geminiService } from '../services/geminiService.js';
import mongoose from 'mongoose';

/**
 * Get active assessment questions
 * GET /api/student/aptitude/questions
 * NOTE: correctAnswer and explanation are omitted by default (select: false)
 */
export const getQuestions = async (req, res, next) => {
  try {
    const questions = await AptitudeQuestion.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    const interestQuestions = questions.filter((q) => q.section === 'interest');
    const abilityQuestions = questions.filter((q) => q.section === 'ability');

    res.status(200).json({
      status: 'success',
      totalQuestions: questions.length,
      data: {
        interestQuestions,
        abilityQuestions,
        allQuestions: questions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a new assessment attempt or resume an active one
 * POST /api/student/aptitude/attempts
 */
export const createAttempt = async (req, res, next) => {
  try {
    const studentId = req.student._id;

    // Check if there is an in-progress attempt to resume
    const inProgress = await AssessmentAttempt.findOne({
      studentId,
      completionStatus: 'in_progress'
    }).sort({ updatedAt: -1 });

    if (inProgress && req.body.forceNew !== true) {
      return res.status(200).json({
        status: 'success',
        isResumed: true,
        data: {
          attempt: inProgress
        }
      });
    }

    // Otherwise create fresh attempt
    const newAttempt = await AssessmentAttempt.create({
      studentId,
      assessmentVersion: 'v1.0',
      completionStatus: 'in_progress',
      currentStep: 1,
      answers: []
    });

    res.status(201).json({
      status: 'success',
      isResumed: false,
      data: {
        attempt: newAttempt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all assessment attempts for authenticated student
 * GET /api/student/aptitude/attempts
 */
export const getAttempts = async (req, res, next) => {
  try {
    const studentId = req.student._id;

    const attempts = await AssessmentAttempt.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      results: attempts.length,
      data: {
        attempts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the latest completed assessment attempt for authenticated student
 * GET /api/student/aptitude/attempts/latest
 */
export const getLatestAttempt = async (req, res, next) => {
  try {
    const studentId = req.student._id;

    const latest = await AssessmentAttempt.findOne({
      studentId,
      completionStatus: 'completed'
    })
      .sort({ completedAt: -1 })
      .lean();

    if (!latest) {
      return res.status(200).json({
        status: 'success',
        data: {
          attempt: null
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        attempt: latest
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get an assessment attempt by ID
 * GET /api/student/aptitude/attempts/:id
 */
export const getAttemptById = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid assessment attempt ID', 400));
    }

    const attempt = await AssessmentAttempt.findById(id).lean();
    if (!attempt) {
      return next(new AppError('Assessment attempt not found', 404));
    }

    // Student isolation check
    if (attempt.studentId.toString() !== studentId.toString()) {
      return next(new AppError('Unauthorized access to this assessment attempt', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        attempt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update draft answers and current step (Auto-save / Pause & Resume)
 * PUT /api/student/aptitude/attempts/:id
 */
export const updateAttempt = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { id } = req.params;
    const { answers, currentStep } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid assessment attempt ID', 400));
    }

    const attempt = await AssessmentAttempt.findById(id);
    if (!attempt) {
      return next(new AppError('Assessment attempt not found', 404));
    }

    // Student isolation check
    if (attempt.studentId.toString() !== studentId.toString()) {
      return next(new AppError('Unauthorized access to this assessment attempt', 403));
    }

    if (attempt.completionStatus === 'completed') {
      return next(new AppError('Cannot update an already completed assessment attempt', 400));
    }

    if (answers && Array.isArray(answers)) {
      attempt.answers = answers;
    }
    if (currentStep !== undefined) {
      attempt.currentStep = currentStep;
    }

    await attempt.save();

    res.status(200).json({
      status: 'success',
      data: {
        attempt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit assessment attempt for deterministic scoring, matching, and AI guidance
 * POST /api/student/aptitude/attempts/:id/submit
 */
export const submitAttempt = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { id } = req.params;
    const { answers } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid assessment attempt ID', 400));
    }

    const attempt = await AssessmentAttempt.findById(id);
    if (!attempt) {
      return next(new AppError('Assessment attempt not found', 404));
    }

    // Student isolation check
    if (attempt.studentId.toString() !== studentId.toString()) {
      return next(new AppError('Unauthorized access to this assessment attempt', 403));
    }

    if (attempt.completionStatus === 'completed') {
      return next(new AppError('This assessment has already been finalized and scored.', 400));
    }

    const submissionAnswers = answers && Array.isArray(answers) && answers.length > 0
      ? answers
      : attempt.answers;

    if (!submissionAnswers || submissionAnswers.length === 0) {
      return next(new AppError('Cannot submit assessment with empty answers.', 400));
    }

    // 1. Deterministic Scoring
    const scoringResult = await aptitudeScoringService.calculateScores(submissionAnswers);
    const student = await Student.findById(studentId).lean();

    // 2. Rule-Based Educational Matching using real MongoDB records
    const ruleBasedRecommendations = await aptitudeScoringService.generateRuleBasedRecommendations({
      student,
      topInterests: scoringResult.topInterests,
      abilityScores: scoringResult.abilityScores
    });

    // 3. Gemini AI Analysis (anonymized, grounded in MongoDB candidates, safe fallback)
    const aiGuidance = await geminiService.generateGuidance({
      topInterests: scoringResult.topInterests,
      interestScores: scoringResult.interestScores,
      abilityScores: scoringResult.abilityScores,
      academicStream: student?.academicProfile?.stream,
      subjects: student?.academicProfile?.subjects,
      candidateCourses: ruleBasedRecommendations.recommendedCourses,
      candidateColleges: ruleBasedRecommendations.recommendedColleges
    });

    // 4. Save completed attempt
    attempt.answers = scoringResult.gradedAnswers;
    attempt.interestScores = scoringResult.interestScores;
    attempt.topInterests = scoringResult.topInterests;
    attempt.riasecCode = scoringResult.riasecCode;
    attempt.abilityScores = scoringResult.abilityScores;
    attempt.ruleBasedRecommendations = ruleBasedRecommendations;
    attempt.aiAnalysis = aiGuidance;
    attempt.completionStatus = 'completed';
    attempt.completedAt = new Date();
    attempt.currentStep = 5;

    await attempt.save();

    res.status(200).json({
      status: 'success',
      message: 'Assessment finalized and scored successfully',
      data: {
        attempt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry Gemini AI Analysis on an already completed attempt
 * POST /api/student/aptitude/attempts/:id/retry-ai
 */
export const retryAiAnalysis = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { id } = req.params;

    const attempt = await AssessmentAttempt.findById(id);
    if (!attempt || attempt.studentId.toString() !== studentId.toString()) {
      return next(new AppError('Assessment attempt not found or unauthorized', 404));
    }

    const student = await Student.findById(studentId).lean();

    const aiGuidance = await geminiService.generateGuidance({
      topInterests: attempt.topInterests,
      interestScores: attempt.interestScores,
      abilityScores: attempt.abilityScores,
      academicStream: student?.academicProfile?.stream,
      subjects: student?.academicProfile?.subjects,
      candidateCourses: attempt.ruleBasedRecommendations?.recommendedCourses || [],
      candidateColleges: attempt.ruleBasedRecommendations?.recommendedColleges || []
    });

    attempt.aiAnalysis = aiGuidance;
    await attempt.save();

    res.status(200).json({
      status: 'success',
      data: {
        aiAnalysis: aiGuidance
      }
    });
  } catch (error) {
    next(error);
  }
};

