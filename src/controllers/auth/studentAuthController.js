import Student from '../../models/Student.js';
import generateToken from '../../utils/generateToken.js';

/**
 * @desc    Student registration
 * @route   POST /api/student/auth/register
 * @access  Public
 */
export const registerStudent = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name, email, and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingStudent = await Student.findOne({ email: normalizedEmail });
    if (existingStudent) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    const student = await Student.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : ''
    });

    res.status(201).json({
      status: 'success',
      message: 'Student registered successfully',
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          profileCompleted: student.profileCompleted,
          isActive: student.isActive,
          createdAt: student.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Student login with email and password
 * @route   POST /api/student/auth/login
 * @access  Public
 */
export const loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find student and explicitly select the password field for comparison
    const student = await Student.findOne({ email: normalizedEmail }).select('+password');

    if (!student) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Compare password
    const isMatch = await student.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    student.lastLogin = new Date();
    await student.save({ validateBeforeSave: false });

    // Generate JWT token with role explicitly set to 'student'
    const token = generateToken({
      id: student._id,
      email: student.email,
      role: 'student'
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          profileCompleted: student.profileCompleted,
          isActive: student.isActive,
          lastLogin: student.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated student profile
 * @route   GET /api/student/profile
 * @access  Private (Protected by Student JWT)
 */
export const getStudentProfile = async (req, res, next) => {
  try {
    // req.student is populated by the protectStudent middleware
    const student = req.student;
    
    res.status(200).json({
      status: 'success',
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          profileCompleted: student.profileCompleted,
          isActive: student.isActive,
          createdAt: student.createdAt,
          lastLogin: student.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current authenticated student profile
 * @route   PUT /api/student/profile
 * @access  Private (Protected by Student JWT)
 */
export const updateStudentProfile = async (req, res, next) => {
  try {
    const studentId = req.student._id;
    const { name, phone } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        student: {
          id: updatedStudent._id,
          name: updatedStudent.name,
          email: updatedStudent.email,
          phone: updatedStudent.phone,
          profileCompleted: updatedStudent.profileCompleted,
          isActive: updatedStudent.isActive,
          updatedAt: updatedStudent.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
