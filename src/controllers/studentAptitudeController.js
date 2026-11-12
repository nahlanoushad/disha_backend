import AptitudeQuestion from '../models/AptitudeQuestion.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Student from '../models/Student.js';
import AppError from '../utils/appError.js';
import { aptitudeScoringService } from '../services/aptitudeScoringService.js';
import { geminiService } from '../services/geminiService.js';
import mongoose from 'mongoose';

/**
 * Get active published career assessment questions for students
 * GET /api/student/aptitude/questions
 */
export const getQuestions = async (req, res, next) => {
  try {
    // Only published Career Discovery questions are delivered to students
    const questions = await AptitudeQuestion.find({
      assessmentType: 'career_discovery',
      status: 'published',
      isActive: true
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    if (!questions || questions.length === 0) {
      return res.status(200).json({
        status: 'success',
        isAvailable: false,
        totalQuestions: 0,
        message: 'Career assessment is currently being prepared. Please check back soon.',
        data: {
          questions: [],
          allQuestions: []
        }
      });
    }

    res.status(200).json({
      status: 'success',
      isAvailable: true,
      totalQuestions: questions.length,
      data: {
        questions,
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
    const student = await Student.findById(studentId).lean();

    // Check if there is an in-progress Career Discovery attempt to resume
    const inProgress = await AssessmentAttempt.findOne({
      studentId,
      assessmentType: 'career_discovery',
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

    // Capture student's current academic profile snapshot
    const studentProfileSnapshot = {
      stream: student?.academicProfile?.stream || '',
      subjects: student?.academicProfile?.subjects || [],
      plusTwoPercentage: student?.academicProfile?.plusTwoPercentage || null
    };

    // Create fresh Career Discovery attempt
    const newAttempt = await AssessmentAttempt.create({
      studentId,
      assessmentVersion: 'v2.0',
      assessmentType: 'career_discovery',
      completionStatus: 'in_progress',
      currentStep: 1,
      studentProfileSnapshot,
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

    // Prefer latest completed v2.0 Career Discovery attempt
    let latest = await AssessmentAttempt.findOne({
      studentId,
      assessmentType: 'career_discovery',
      completionStatus: 'completed'
    })
      .sort({ completedAt: -1 })
      .lean();

    // Fall back to any completed attempt (e.g. legacy v1.0)
    if (!latest) {
      latest = await AssessmentAttempt.findOne({
        studentId,
        completionStatus: 'completed'
      })
        .sort({ completedAt: -1 })
        .lean();
    }

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

    const student = await Student.findById(studentId).lean();

    // If Career Discovery (v2.0):
    if (attempt.assessmentType === 'career_discovery' || attempt.assessmentVersion === 'v2.0') {
      // 1. Deterministic Course Matching based on real MongoDB courses & collected tags
      const discoveryResult = await aptitudeScoringService.scoreCareerDiscovery({
        answers: submissionAnswers,
        student
      });

      // 2. Gemini Grounded Natural Language Guidance
      const aiGuidance = await geminiService.generateCareerGuidance({
        studentProfile: student?.academicProfile || attempt.studentProfileSnapshot,
        profileSummary: discoveryResult.profileSummary,
        candidateCourses: discoveryResult.courseRecommendations,
        candidateColleges: discoveryResult.collegeRecommendations
      });

      attempt.answers = discoveryResult.gradedAnswers;
      attempt.courseRecommendations = discoveryResult.courseRecommendations;
      attempt.collegeRecommendations = discoveryResult.collegeRecommendations;
      attempt.profileSummary = discoveryResult.profileSummary;
      attempt.aiAnalysis = aiGuidance;
      attempt.completionStatus = 'completed';
      attempt.completedAt = new Date();
      attempt.currentStep = 5;

      await attempt.save();

      return res.status(200).json({
        status: 'success',
        message: 'Career Discovery assessment completed successfully',
        data: {
          attempt
        }
      });
    }

    // Fallback for legacy v1.0 RIASEC attempts:
    const scoringResult = await aptitudeScoringService.calculateScores(submissionAnswers);
    const ruleBasedRecommendations = await aptitudeScoringService.generateRuleBasedRecommendations({
      student,
      topInterests: scoringResult.topInterests,
      abilityScores: scoringResult.abilityScores
    });

    const aiGuidance = await geminiService.generateGuidance({
      topInterests: scoringResult.topInterests,
      interestScores: scoringResult.interestScores,
      abilityScores: scoringResult.abilityScores,
      academicStream: student?.academicProfile?.stream,
      subjects: student?.academicProfile?.subjects,
      candidateCourses: ruleBasedRecommendations.recommendedCourses,
      candidateColleges: ruleBasedRecommendations.recommendedColleges
    });

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

    if (attempt.assessmentType === 'career_discovery' || attempt.assessmentVersion === 'v2.0') {
      const aiGuidance = await geminiService.generateCareerGuidance({
        studentProfile: student?.academicProfile || attempt.studentProfileSnapshot,
        profileSummary: attempt.profileSummary,
        candidateCourses: attempt.courseRecommendations || [],
        candidateColleges: attempt.collegeRecommendations || []
      });

      attempt.aiAnalysis = aiGuidance;
      await attempt.save();

      return res.status(200).json({
        status: 'success',
        data: {
          aiAnalysis: aiGuidance
        }
      });
    }

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
