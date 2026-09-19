import * as studentService from '../services/studentService.js';

/**
 * @desc    Get all students
 * @route   GET /api/admin/students
 * @access  Private/Admin
 */
export const getStudents = async (req, res, next) => {
  try {
    const result = await studentService.getAllStudents(req.query);

    res.status(200).json({
      status: 'success',
      pagination: result.pagination,
      data: {
        students: result.students
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student by ID
 * @route   GET /api/admin/students/:id
 * @access  Private/Admin
 */
export const getStudent = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student status (active/inactive)
 * @route   PATCH /api/admin/students/:id/status
 * @access  Private/Admin
 */
export const updateStudentStatus = async (req, res, next) => {
  try {
    const student = await studentService.updateStudentStatus(req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    next(error);
  }
};
