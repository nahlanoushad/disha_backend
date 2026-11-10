import Course from '../models/Course.js';
import Category from '../models/Category.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';

/**
 * Retrieve all courses, optionally filtered by query
 * @param {Object} query - Query parameters
 * @returns {Promise<Array>} List of courses
 */
export const getAllCourses = async (query = {}) => {
  const filter = {};
  
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.category) {
    if (!mongoose.isValidObjectId(query.category)) {
      throw new AppError('Invalid category ID filter format', 400);
    }
    filter.category = query.category;
  }
  
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [courses, totalItems] = await Promise.all([
    Course.find(filter)
      .populate('category', 'name status')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Course.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    courses,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages
    }
  };
};

/**
 * Retrieve a single course by ID
 * @param {string} id - Course ObjectId
 * @returns {Promise<Object>} Course document
 */
export const getCourseById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid course ID format', 400);
  }

  const course = await Course.findById(id).populate('category', 'name status');
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return course;
};

/**
 * Create a new course
 * @param {Object} courseData - Course data
 * @returns {Promise<Object>} Created course document
 */
export const createCourse = async (courseData) => {
  let { name, category, status } = courseData;
  
  if (!name || name.trim() === '') {
    throw new AppError('Course name is required', 400);
  }
  
  name = name.trim();

  if (!category) {
    throw new AppError('Category is required', 400);
  }

  if (!mongoose.isValidObjectId(category)) {
    throw new AppError('Invalid category ID format', 400);
  }

  // Validate that the referenced category actually exists
  const existingCat = await Category.findById(category);
  if (!existingCat) {
    throw new AppError('Referenced category does not exist', 400);
  }
  
  // Check for duplicate course name (case-insensitive)
  const existingCourse = await Course.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  
  if (existingCourse) {
    throw new AppError(`Course with name "${name}" already exists`, 409);
  }

  const newCourse = await Course.create({ ...courseData, name });
  
  // Populate category for the response
  await newCourse.populate('category', 'name status');
  
  return newCourse;
};

/**
 * Update an existing course
 * @param {string} id - Course ObjectId
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated course document
 */
export const updateCourse = async (id, updateData) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid course ID format', 400);
  }

  const course = await Course.findById(id);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  if (updateData.name !== undefined) {
    let name = updateData.name.trim();
    if (name === '') {
      throw new AppError('Course name is required', 400);
    }
    
    // Check if another course has the same name
    const existingCourse = await Course.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    
    if (existingCourse) {
      throw new AppError(`Course with name "${name}" already exists`, 409);
    }
    
    course.name = name;
  }

  if (updateData.category !== undefined) {
    if (!mongoose.isValidObjectId(updateData.category)) {
      throw new AppError('Invalid category ID format', 400);
    }

    const existingCat = await Category.findById(updateData.category);
    if (!existingCat) {
      throw new AppError('Referenced category does not exist', 400);
    }

    course.category = updateData.category;
  }

  const fieldsToUpdate = [
    'description', 'eligibility', 'duration', 'feeStructure', 
    'admissionProcedure', 'entranceExams', 'careerOpportunities', 
    'higherStudyOptions', 'expectedSalaryRange', 'status'
  ];

  fieldsToUpdate.forEach(field => {
    if (updateData[field] !== undefined) {
      if (typeof updateData[field] === 'string') {
        course[field] = updateData[field].trim();
      } else {
        course[field] = updateData[field];
      }
    }
  });

  await course.save();
  await course.populate('category', 'name status');
  
  return course;
};

/**
 * Delete a course
 * @param {string} id - Course ObjectId
 * @returns {Promise<Object>} Deleted course document
 */
export const deleteCourse = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid course ID format', 400);
  }

  const course = await Course.findByIdAndDelete(id);
  
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return course;
};
