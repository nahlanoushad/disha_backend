import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';

/**
 * Middleware to protect routes and ensure request comes from an authenticated admin
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized to access this route. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'disha_default_jwt_secret'
    );

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        status: 'fail',
        message: 'The admin belonging to this token no longer exists.'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'This admin account has been deactivated.'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized, token invalid or expired.',
      error: error.message
    });
  }
};

/**
 * Middleware to protect routes and ensure request comes from an authenticated student
 */
export const protectStudent = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized to access this route. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'disha_default_jwt_secret'
    );

    if (decoded.role !== 'student') {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden. This endpoint requires student access.'
      });
    }

    const student = await Student.findById(decoded.id);

    if (!student) {
      return res.status(401).json({
        status: 'fail',
        message: 'The student belonging to this token no longer exists.'
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'This student account has been deactivated.'
      });
    }

    req.student = student;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized, token invalid or expired.',
      error: error.message
    });
  }
};
