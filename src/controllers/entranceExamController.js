import * as entranceExamService from '../services/entranceExamService.js';

/**
 * @desc    Get all entrance exams
 * @route   GET /api/entrance-exams
 * @access  Public
 */
export const getEntranceExams = async (req, res, next) => {
  try {
    const result = await entranceExamService.getAllEntranceExams(req.query);
    res.status(200).json({
      status: 'success',
      pagination: result.pagination,
      data: {
        entranceExams: result.entranceExams
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get entrance exam by ID
 * @route   GET /api/entrance-exams/:id
 * @access  Public
 */
export const getEntranceExam = async (req, res, next) => {
  try {
    const entranceExam = await entranceExamService.getEntranceExamById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        entranceExam
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new entrance exam
 * @route   POST /api/entrance-exams
 * @access  Private/Admin
 */
export const createEntranceExam = async (req, res, next) => {
  try {
    const entranceExam = await entranceExamService.createEntranceExam(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        entranceExam
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update entrance exam
 * @route   PATCH /api/entrance-exams/:id
 * @route   PUT /api/entrance-exams/:id
 * @access  Private/Admin
 */
export const updateEntranceExam = async (req, res, next) => {
  try {
    const entranceExam = await entranceExamService.updateEntranceExam(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        entranceExam
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete entrance exam
 * @route   DELETE /api/entrance-exams/:id
 * @access  Private/Admin
 */
export const deleteEntranceExam = async (req, res, next) => {
  try {
    await entranceExamService.deleteEntranceExam(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

