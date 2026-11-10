import * as courseService from '../services/courseService.js';

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
export const getAllCourses = async (req, res, next) => {
  try {
    let { search, status, category, page, limit } = req.query;

    if (search) {
      search = search.trim();
    }

    if (status && !['active', 'inactive', 'all'].includes(status)) {
      const error = new Error('Invalid status filter');
      error.statusCode = 400;
      return next(error);
    }

    let parsedPage = parseInt(page);
    let parsedLimit = parseInt(limit);

    if (page !== undefined && (isNaN(parsedPage) || parsedPage < 1)) {
      const error = new Error('Invalid page number');
      error.statusCode = 400;
      return next(error);
    }

    if (limit !== undefined && (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
      const error = new Error('Invalid limit number');
      error.statusCode = 400;
      return next(error);
    }

    const { courses, pagination } = await courseService.getAllCourses({
      search,
      status,
      category,
      page: parsedPage || 1,
      limit: parsedLimit || 10
    });

    res.status(200).json({
      status: 'success',
      results: courses.length,
      data: {
        courses
      },
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get course by ID
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        course
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private/Admin
 */
export const createCourse = async (req, res, next) => {
  try {
    const course = await courseService.createCourse(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
      data: {
        course
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      error.statusCode = 400;
    }
    // Handle mongoose unique constraint error if it bypassed service layer checks somehow
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = `Course with name "${req.body.name}" already exists`;
    }
    next(error);
  }
};

/**
 * @desc    Update a course
 * @route   PUT /api/courses/:id
 * @route   PATCH /api/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: {
        course
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      error.statusCode = 400;
    }
    next(error);
  }
};

/**
 * @desc    Delete a course
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Course deleted successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
