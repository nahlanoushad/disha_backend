import EntranceExam from '../models/EntranceExam.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';
import { computeExamStatus } from '../utils/examDateHelper.js';

/**
 * Synthesizes default importantDates array from primary date fields if importantDates is empty
 */
const synthesizeImportantDatesIfEmpty = (examData) => {
  if (Array.isArray(examData.importantDates) && examData.importantDates.length > 0) {
    return examData.importantDates;
  }

  const synthesized = [];
  if (examData.registrationStartDate) {
    synthesized.push({
      eventType: 'application_opening',
      title: 'Application Window Opens',
      date: new Date(examData.registrationStartDate),
      description: 'Online application submissions begin.',
      officialSourceUrl: examData.officialWebsite || ''
    });
  }
  if (examData.registrationEndDate) {
    synthesized.push({
      eventType: 'application_closing',
      title: 'Application Deadline',
      date: new Date(examData.registrationEndDate),
      description: 'Last date for submission of online applications and fee.',
      officialSourceUrl: examData.officialWebsite || ''
    });
  }
  if (examData.admitCardRelease) {
    synthesized.push({
      eventType: 'admit_card_release',
      title: 'Admit Card Release',
      date: new Date(examData.admitCardRelease),
      description: 'Hall tickets available for download on the official portal.',
      officialSourceUrl: examData.officialWebsite || ''
    });
  }
  if (examData.examDate) {
    synthesized.push({
      eventType: 'examination',
      title: 'Examination Date',
      date: new Date(examData.examDate),
      description: `Official test day for ${examData.name || 'exam'}.`,
      officialSourceUrl: examData.officialWebsite || ''
    });
  }
  return synthesized;
};

/**
 * Retrieve all entrance exams, optionally filtered by query
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} List of exams with computed status & pagination
 */
export const getAllEntranceExams = async (query = {}) => {
  const filter = {};
  
  if (query.status && query.status !== 'all' && query.status !== 'active' && query.status !== 'inactive') {
    // If querying by calculated status, handled post-query or via computed status filter
  } else if (query.status && (query.status === 'active' || query.status === 'inactive')) {
    filter.status = query.status;
  }

  if (query.category && query.category !== 'all') {
    filter.streamCategory = { $regex: query.category, $options: 'i' };
  }

  if (query.examLevel && query.examLevel !== 'all') {
    filter.examLevel = query.examLevel;
  }

  if (query.course && query.course !== 'all') {
    filter.relatedCourses = { $regex: query.course, $options: 'i' };
  }
  
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { conductingAuthority: { $regex: query.search, $options: 'i' } },
      { streamCategory: { $regex: query.search, $options: 'i' } },
      { relatedCourses: { $regex: query.search, $options: 'i' } }
    ];
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  // Retrieve matching exams
  const [rawExams, totalItems] = await Promise.all([
    EntranceExam.find(filter)
      .sort({ examDate: 1, name: 1 })
      .lean(),
    EntranceExam.countDocuments(filter)
  ]);

  // Attach dynamically computed statuses in Asia/Kolkata timezone
  let entranceExams = rawExams.map((exam) => {
    const computedStatus = computeExamStatus(exam);
    return {
      ...exam,
      computedStatus,
      importantDates: (exam.importantDates && exam.importantDates.length > 0)
        ? exam.importantDates
        : synthesizeImportantDatesIfEmpty(exam)
    };
  });

  // Filter by computed status if requested (e.g. 'Applications Open', 'Closing Soon', 'Upcoming', 'Examination Completed')
  if (query.status && !['all', 'active', 'inactive'].includes(query.status)) {
    const targetStatus = query.status.toLowerCase();
    entranceExams = entranceExams.filter((e) => e.computedStatus.toLowerCase() === targetStatus);
  }

  // Calculate summary counts across all database exams
  const allDbExams = await EntranceExam.find({ status: 'active' }).lean();
  const summaryCounts = {
    total: allDbExams.length,
    open: 0,
    closingSoon: 0,
    upcoming: 0,
    completed: 0
  };

  allDbExams.forEach((e) => {
    const status = computeExamStatus(e);
    if (status === 'Applications Open') summaryCounts.open++;
    else if (status === 'Closing Soon') {
      summaryCounts.closingSoon++;
      summaryCounts.open++; // closing soon is also open
    } else if (status === 'Upcoming') summaryCounts.upcoming++;
    else if (status === 'Examination Completed') summaryCounts.completed++;
  });

  // Apply pagination on in-memory list if status filtering happened, otherwise slice
  const paginatedExams = entranceExams.slice(skip, skip + limit);
  const totalPages = Math.ceil(entranceExams.length / limit) || 1;

  return {
    entranceExams: paginatedExams,
    summaryCounts,
    pagination: {
      page,
      limit,
      totalItems: entranceExams.length,
      totalPages
    }
  };
};

/**
 * Retrieve a single entrance exam by ID
 * @param {string} id - Exam ObjectId
 * @returns {Promise<Object>} Exam document with computedStatus
 */
export const getEntranceExamById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid entrance exam ID format', 400);
  }

  const exam = await EntranceExam.findById(id).lean();
  if (!exam) {
    throw new AppError('Entrance Exam not found', 404);
  }

  const computedStatus = computeExamStatus(exam);
  const importantDates = (exam.importantDates && exam.importantDates.length > 0)
    ? exam.importantDates
    : synthesizeImportantDatesIfEmpty(exam);

  return {
    ...exam,
    computedStatus,
    importantDates
  };
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

  // Synthesize importantDates if none provided
  const importantDates = synthesizeImportantDatesIfEmpty(examData);

  const newExam = await EntranceExam.create({
    ...examData,
    name,
    importantDates
  });
  
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
    'officialWebsite', 'importantInstructions', 'status', 'streamCategory',
    'examLevel', 'syllabusSummary', 'applicationFee', 'verificationStatus', 'verificationSource'
  ];

  stringFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      exam[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
    }
  });

  const dateFields = [
    'registrationStartDate', 'registrationEndDate', 'examDate', 'admitCardRelease'
  ];

  dateFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      exam[field] = updateData[field] === '' ? null : updateData[field];
    }
  });

  if (updateData.relatedCourses !== undefined) {
    exam.relatedCourses = Array.isArray(updateData.relatedCourses)
      ? updateData.relatedCourses
      : updateData.relatedCourses.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (updateData.examPattern !== undefined && typeof updateData.examPattern === 'object') {
    exam.examPattern = { ...exam.examPattern, ...updateData.examPattern };
  }

  if (updateData.importantDates !== undefined && Array.isArray(updateData.importantDates)) {
    exam.importantDates = updateData.importantDates;
  } else if (!exam.importantDates || exam.importantDates.length === 0) {
    exam.importantDates = synthesizeImportantDatesIfEmpty(exam);
  }

  // Validate dates
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
