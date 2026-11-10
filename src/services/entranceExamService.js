import EntranceExam from '../models/EntranceExam.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';

/**
 * Retrieve all entrance exams, optionally filtered by query
 * @param {Object} query - Query parameters
 * @returns {Promise<Array>} List of exams
 */
export const getAllEntranceExams = async (query = {}) => {
  const filter = {};
  
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { conductingAuthority: { $regex: query.search, $options: 'i' } }
    ];
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [entranceExams, totalItems] = await Promise.all([
    EntranceExam.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    EntranceExam.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    entranceExams,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages
    }
  };
};

/**
 * Retrieve a single entrance exam by ID
 * @param {string} id - Exam ObjectId
 * @returns {Promise<Object>} Exam document
 */
export const getEntranceExamById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid entrance exam ID format', 400);
  }

  const exam = await EntranceExam.findById(id);
  if (!exam) {
    throw new AppError('Entrance Exam not found', 404);
  }

  return exam;
};

/**
 * Create a new entrance exam
 * @param {Object} examData - Exam data
 * @returns {Promise<Object>} Created exam document
 */
export const createEntranceExam = async (examData) => {
  let { name, conductingAuthority } = examData;
  
  if (!name || name.trim() === '') {
    throw new AppError('Entrance Exam name is required', 400);
  }

  if (!conductingAuthority || conductingAuthority.trim() === '') {
    throw new AppError('Conducting Authority is required', 400);
  }
  
  name = name.trim();
  
  // Check for duplicate exam name (case-insensitive)
  const existingExam = await EntranceExam.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  
  if (existingExam) {
    throw new AppError(`Entrance Exam with name "${name}" already exists`, 409);
  }

  if (examData.registrationStartDate && examData.registrationEndDate) {
    const start = new Date(examData.registrationStartDate);
    const end = new Date(examData.registrationEndDate);
    if (start > end) {
      throw new AppError('Registration start date cannot be after registration end date', 400);
    }
  }

  const newExam = await EntranceExam.create({ ...examData, name });
  
  return newExam;
};

/**
 * Update an existing entrance exam
 * @param {string} id - Exam ObjectId
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated exam document
 */
export const updateEntranceExam = async (id, updateData) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid entrance exam ID format', 400);
  }

  const exam = await EntranceExam.findById(id);
  if (!exam) {
    throw new AppError('Entrance Exam not found', 404);
  }

  if (updateData.name !== undefined) {
    let name = updateData.name.trim();
    if (name === '') {
      throw new AppError('Entrance Exam name is required', 400);
    }
    
    // Check if another exam has the same name
    const existingExam = await EntranceExam.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    
    if (existingExam) {
      throw new AppError(`Entrance Exam with name "${name}" already exists`, 409);
    }
    
    exam.name = name;
  }

  if (updateData.conductingAuthority !== undefined) {
    let authority = updateData.conductingAuthority.trim();
    if (authority === '') {
      throw new AppError('Conducting Authority is required', 400);
    }
    exam.conductingAuthority = authority;
  }

  const stringFields = [
    'eligibilityCriteria', 'applicationProcess', 'counsellingSchedule',
    'officialWebsite', 'importantInstructions', 'status'
  ];

  stringFields.forEach(field => {
    if (updateData[field] !== undefined) {
      exam[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
    }
  });

  const dateFields = [
    'registrationStartDate', 'registrationEndDate', 'examDate', 'admitCardRelease'
  ];

  dateFields.forEach(field => {
    if (updateData[field] !== undefined) {
      exam[field] = updateData[field] === '' ? null : updateData[field];
    }
  });

  // Re-check date logic if either changed
  const start = exam.registrationStartDate ? new Date(exam.registrationStartDate) : null;
  const end = exam.registrationEndDate ? new Date(exam.registrationEndDate) : null;
  if (start && end && start > end) {
    throw new AppError('Registration start date cannot be after registration end date', 400);
  }

  await exam.save();
  
  return exam;
};

/**
 * Delete an entrance exam
 * @param {string} id - Exam ObjectId
 * @returns {Promise<Object>} Deleted exam document
 */
export const deleteEntranceExam = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid entrance exam ID format', 400);
  }

  const exam = await EntranceExam.findByIdAndDelete(id);
  
  if (!exam) {
    throw new AppError('Entrance Exam not found', 404);
  }

  return exam;
};
