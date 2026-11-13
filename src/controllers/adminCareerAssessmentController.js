import AptitudeQuestion from '../models/AptitudeQuestion.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';

/**
 * Get all career assessment questions for Admin
 * GET /api/admin/career-assessment/questions
 */
export const getAdminQuestions = async (req, res, next) => {
  try {
    const { status, section, search } = req.query;

    const query = {
      assessmentType: 'career_discovery'
    };

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query.status = status;
    }

    if (section) {
      query.section = section;
    }

    if (search && search.trim() !== '') {
      query.questionText = { $regex: search.trim(), $options: 'i' };
    }

    const questions = await AptitudeQuestion.find(query)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Compute live metrics
    const [total, published, draft, archived] = await Promise.all([
      AptitudeQuestion.countDocuments({ assessmentType: 'career_discovery' }),
      AptitudeQuestion.countDocuments({ assessmentType: 'career_discovery', status: 'published' }),
      AptitudeQuestion.countDocuments({ assessmentType: 'career_discovery', status: 'draft' }),
      AptitudeQuestion.countDocuments({ assessmentType: 'career_discovery', status: 'archived' })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        questions,
        metrics: {
          total,
          published,
          draft,
          archived
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Career Assessment Question
 * POST /api/admin/career-assessment/questions
 */
export const createAdminQuestion = async (req, res, next) => {
  try {
    const {
      questionText,
      section,
      answerType = 'single_choice',
      category = 'General',
      options,
      status = 'draft',
      order = 0,
      difficulty = 'medium'
    } = req.body;

    if (!questionText || questionText.trim() === '') {
      return next(new AppError('Question text is required', 400));
    }

    if (!section || section.trim() === '') {
      return next(new AppError('Question section is required', 400));
    }

    if (!Array.isArray(options) || options.length < 2) {
      return next(new AppError('At least 2 options are required', 400));
    }

    // Validate options structure
    const cleanedOptions = options.map((opt, idx) => {
      if (!opt.text || opt.text.trim() === '') {
        throw new Error(`Option ${idx + 1} must have descriptive text`);
      }
      return {
        text: opt.text.trim(),
        value: opt.value !== undefined ? opt.value : String(idx + 1),
        tags: Array.isArray(opt.tags)
          ? opt.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
          : []
      };
    });

    // Determine order if not explicitly set
    let questionOrder = Number(order);
    if (isNaN(questionOrder) || questionOrder <= 0) {
      const highest = await AptitudeQuestion.findOne({ assessmentType: 'career_discovery' })
        .sort({ order: -1 })
        .lean();
      questionOrder = (highest?.order || 0) + 1;
    }

    const newQuestion = await AptitudeQuestion.create({
      questionText: questionText.trim(),
      section: section.trim(),
      assessmentType: 'career_discovery',
      answerType: ['single_choice', 'multiple_choice'].includes(answerType) ? answerType : 'single_choice',
      category: category.trim(),
      options: cleanedOptions,
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      order: questionOrder,
      difficulty,
      assessmentVersion: 'v2.0',
      publishedVersion: 'v2.0',
      isActive: true
    });

    res.status(201).json({
      status: 'success',
      message: 'Assessment question created successfully',
      data: {
        question: newQuestion
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single question by ID
 * GET /api/admin/career-assessment/questions/:id
 */
export const getAdminQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid question ID', 400));
    }

    const question = await AptitudeQuestion.findById(id).lean();
    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        question
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing question
 * PUT /api/admin/career-assessment/questions/:id
 */
export const updateAdminQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid question ID', 400));
    }

    const {
      questionText,
      section,
      answerType,
      category,
      options,
      status,
      order,
      difficulty
    } = req.body;

    const question = await AptitudeQuestion.findById(id);
    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    if (questionText) question.questionText = questionText.trim();
    if (section) question.section = section.trim();
    if (category) question.category = category.trim();
    if (answerType && ['single_choice', 'multiple_choice'].includes(answerType)) {
      question.answerType = answerType;
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      question.status = status;
    }
    if (order !== undefined) question.order = Number(order);
    if (difficulty) question.difficulty = difficulty;

    if (options && Array.isArray(options)) {
      question.options = options.map((opt, idx) => ({
        text: opt.text ? opt.text.trim() : `Option ${idx + 1}`,
        value: opt.value !== undefined ? opt.value : String(idx + 1),
        tags: Array.isArray(opt.tags)
          ? opt.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
          : []
      }));
    }

    await question.save();

    res.status(200).json({
      status: 'success',
      message: 'Question updated successfully',
      data: {
        question
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a question (permanently if draft, or soft-archive if published)
 * DELETE /api/admin/career-assessment/questions/:id
 */
export const deleteAdminQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid question ID', 400));
    }

    const question = await AptitudeQuestion.findById(id);
    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    // Permanently remove question from database
    await AptitudeQuestion.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle or update status of question
 * PATCH /api/admin/career-assessment/questions/:id/status
 */
export const updateQuestionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError('Invalid question ID', 400));
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return next(new AppError('Status must be draft, published, or archived', 400));
    }

    const question = await AptitudeQuestion.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!question) {
      return next(new AppError('Question not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: `Question status updated to ${status}`,
      data: {
        question
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish all draft questions or bump published version
 * POST /api/admin/career-assessment/publish
 */
export const publishQuestionSet = async (req, res, next) => {
  try {
    const result = await AptitudeQuestion.updateMany(
      { assessmentType: 'career_discovery', status: 'draft' },
      { $set: { status: 'published', publishedVersion: 'v2.0' } }
    );

    const publishedCount = await AptitudeQuestion.countDocuments({
      assessmentType: 'career_discovery',
      status: 'published'
    });

    res.status(200).json({
      status: 'success',
      message: `Successfully published questions. Total active published: ${publishedCount}`,
      data: {
        modifiedCount: result.modifiedCount,
        totalPublished: publishedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview question set as student would see them
 * GET /api/admin/career-assessment/preview
 */
export const previewQuestionSet = async (req, res, next) => {
  try {
    const { includeDrafts } = req.query;

    const filter = {
      assessmentType: 'career_discovery'
    };

    if (includeDrafts === 'true') {
      filter.status = { $in: ['published', 'draft'] };
    } else {
      filter.status = 'published';
    }

    const questions = await AptitudeQuestion.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      totalQuestions: questions.length,
      data: {
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

