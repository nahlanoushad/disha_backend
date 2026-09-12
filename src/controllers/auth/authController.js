import Admin from '../../models/Admin.js';
import generateToken from '../../utils/generateToken.js';

/**
 * @desc    Admin login with email (or username) and password
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();

    // Validate inputs
    if (!identifier || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide both email and password'
      });
    }

    // Find admin by email or username (include password hash for comparison)
    const admin = await Admin.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    }).select('+password');

    if (!admin) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact an administrator.'
      });
    }

    // Compare password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = generateToken({
      id: admin._id,
      email: admin.email,
      role: admin.role
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          lastLogin: admin.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated admin profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
        lastLogin: req.admin.lastLogin,
        createdAt: req.admin.createdAt
      }
    }
  });
};
