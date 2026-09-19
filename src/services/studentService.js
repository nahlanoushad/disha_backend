import Student from '../models/Student.js';

/**
 * Get all students with pagination, search and status filter
 */
export const getAllStudents = async (query) => {
  const { search, status, page = 1, limit = 10 } = query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  const [students, totalItems] = await Promise.all([
    Student.find(filter)
      .select('-password') // Ensure password hash is excluded
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum),
    Student.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    students,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: totalPages > 0 ? totalPages : 1
    }
  };
};

/**
 * Get student by ID
 */
export const getStudentById = async (id) => {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    const error = new Error('Invalid student ID format');
    error.statusCode = 400;
    throw error;
  }

  const student = await Student.findById(id).select('-password');
  
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }
  
  return student;
};

/**
 * Update student status (active/inactive)
 */
export const updateStudentStatus = async (id, statusData) => {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    const error = new Error('Invalid student ID format');
    error.statusCode = 400;
    throw error;
  }

  const { status } = statusData;
  if (status !== 'active' && status !== 'inactive') {
    const error = new Error('Invalid status value. Must be active or inactive');
    error.statusCode = 400;
    throw error;
  }

  const isActive = status === 'active';

  const student = await Student.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  return student;
};
