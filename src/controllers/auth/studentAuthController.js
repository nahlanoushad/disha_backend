import Student from '../../models/Student.js';
import generateToken from '../../utils/generateToken.js';
import crypto from 'crypto';
import sendEmail from '../../utils/sendEmail.js';

/**
 * Calculate actual profile completion percentage based on filled fields
 */
export const calculateProfileCompletion = (student) => {
  let score = 0;
  if (student.name) score += 10;
  if (student.email) score += 10;
  if (student.phone && student.phone.trim().length > 0) score += 10;
  if (student.academicProfile?.qualification) score += 10;
  if (student.academicProfile?.stream) score += 15;
  if (student.academicProfile?.board) score += 10;
  if (student.academicProfile?.marksPercentage) score += 10;
  if (student.location?.state && student.location?.district) score += 15;
  if (
    (Array.isArray(student.preferences?.interestedStreams) && student.preferences.interestedStreams.length > 0) ||
    (Array.isArray(student.interests) && student.interests.length > 0)
  ) {
    score += 10;
  }
  return Math.min(score, 100);
};

/**
 * Format student object safely for API responses
 */
const formatStudentResponse = (student) => {
  const completionPercentage = calculateProfileCompletion(student);
  return {
    id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone || '',
    profileCompleted: completionPercentage >= 70,
    profileCompletionPercentage: completionPercentage,
    isActive: student.isActive,
    academicProfile: student.academicProfile || {
      qualification: '',
      plusTwoStatus: '',
      board: '',
      stream: '',
      subjects: [],
      passingYear: '',
      marksPercentage: '',
      schoolName: ''
    },
    location: {
      displayName: student.location?.displayName || '',
      locality: student.location?.locality || '',
      city: student.location?.city || '',
      district: student.location?.district || '',
      state: student.location?.state || '',
      country: student.location?.country || 'India',
      pincode: student.location?.pincode || '',
      coordinates: {
        latitude: student.location?.coordinates?.latitude ?? null,
        longitude: student.location?.coordinates?.longitude ?? null
      },
      source: student.location?.source || ''
    },
    locationSetupCompleted: Boolean(student.locationSetupCompleted),
    locationUpdatedAt: student.locationUpdatedAt || null,
    preferences: student.preferences || {
      interestedStreams: [],
      preferredLocations: [],
      budgetRange: '',
      preferredDuration: ''
    },
    interests: student.interests || [],
    createdAt: student.createdAt,
    lastLogin: student.lastLogin,
    updatedAt: student.updatedAt
  };
};

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
        student: formatStudentResponse(student)
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
        student: formatStudentResponse(student)
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
        student: formatStudentResponse(student)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current authenticated student profile (Personal, Academic, Location, Preferences, Interests)
 * @route   PUT /api/student/profile
 * @access  Private (Protected by Student JWT)
 */
export const updateStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student._id);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student account not found'
      });
    }

    const {
      name,
      phone,
      academicProfile,
      location,
      preferences,
      interests
    } = req.body;

    // Update basic fields
    if (name !== undefined && name.trim()) student.name = name.trim();
    if (phone !== undefined) student.phone = phone.trim();

    // Update Academic Profile
    if (academicProfile && typeof academicProfile === 'object') {
      student.academicProfile = {
        qualification: academicProfile.qualification !== undefined ? String(academicProfile.qualification).trim() : (student.academicProfile?.qualification || ''),
        plusTwoStatus: academicProfile.plusTwoStatus !== undefined ? String(academicProfile.plusTwoStatus).trim() : (student.academicProfile?.plusTwoStatus || ''),
        board: academicProfile.board !== undefined ? String(academicProfile.board).trim() : (student.academicProfile?.board || ''),
        stream: academicProfile.stream !== undefined ? String(academicProfile.stream).trim() : (student.academicProfile?.stream || ''),
        subjects: Array.isArray(academicProfile.subjects) ? academicProfile.subjects.map(s => String(s).trim()).filter(Boolean) : (student.academicProfile?.subjects || []),
        passingYear: academicProfile.passingYear !== undefined ? String(academicProfile.passingYear).trim() : (student.academicProfile?.passingYear || ''),
        marksPercentage: academicProfile.marksPercentage !== undefined ? String(academicProfile.marksPercentage).trim() : (student.academicProfile?.marksPercentage || ''),
        schoolName: academicProfile.schoolName !== undefined ? String(academicProfile.schoolName).trim() : (student.academicProfile?.schoolName || '')
      };
    }

    // Update Location
    if (location && typeof location === 'object') {
      student.location = {
        displayName: location.displayName !== undefined ? String(location.displayName).trim() : (student.location?.displayName || ''),
        locality: location.locality !== undefined ? String(location.locality).trim() : (student.location?.locality || ''),
        city: location.city !== undefined ? String(location.city).trim() : (student.location?.city || ''),
        district: location.district !== undefined ? String(location.district).trim() : (student.location?.district || ''),
        state: location.state !== undefined ? String(location.state).trim() : (student.location?.state || ''),
        country: location.country !== undefined ? String(location.country).trim() : (student.location?.country || 'India'),
        pincode: location.pincode !== undefined ? String(location.pincode).trim() : (student.location?.pincode || ''),
        coordinates: {
          latitude: location.coordinates?.latitude !== undefined && location.coordinates?.latitude !== null ? Number(location.coordinates.latitude) : (student.location?.coordinates?.latitude ?? null),
          longitude: location.coordinates?.longitude !== undefined && location.coordinates?.longitude !== null ? Number(location.coordinates.longitude) : (student.location?.coordinates?.longitude ?? null)
        },
        source: location.source !== undefined ? String(location.source).trim() : (student.location?.source || '')
      };
    }

    // Update Preferences
    if (preferences && typeof preferences === 'object') {
      student.preferences = {
        interestedStreams: Array.isArray(preferences.interestedStreams) ? preferences.interestedStreams.map(s => String(s).trim()).filter(Boolean) : (student.preferences?.interestedStreams || []),
        preferredLocations: Array.isArray(preferences.preferredLocations) ? preferences.preferredLocations.map(s => String(s).trim()).filter(Boolean) : (student.preferences?.preferredLocations || []),
        budgetRange: preferences.budgetRange !== undefined ? String(preferences.budgetRange).trim() : (student.preferences?.budgetRange || ''),
        preferredDuration: preferences.preferredDuration !== undefined ? String(preferences.preferredDuration).trim() : (student.preferences?.preferredDuration || '')
      };
    }

    // Update Interests
    if (Array.isArray(interests)) {
      student.interests = interests.map(i => String(i).trim()).filter(Boolean);
    }

    // Re-calculate completion
    const completionScore = calculateProfileCompletion(student);
    student.profileCompleted = completionScore >= 70;

    await student.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        student: formatStudentResponse(student)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - Generate reset token and email it
 * @route   POST /api/student/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an email address'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    // Security requirement: Never reveal whether an email address is registered
    const genericSuccessMessage =
      'If an account with that email exists, a password reset link has been sent.';

    if (!student || !student.isActive) {
      return res.status(200).json({
        status: 'success',
        message: genericSuccessMessage
      });
    }

    // Generate reset token and save
    const resetToken = student.getResetPasswordToken();
    await student.save({ validateBeforeSave: false });

    // Build reset URL
    const clientBaseUrl =
      process.env.FRONTEND_URL ||
      req.headers.origin ||
      'http://localhost:5173';
    const resetUrl = `${clientBaseUrl}/student/reset-password?token=${resetToken}`;

    const message = `Dear ${student.name},\n\nYou requested a password reset for your DISHA Student Portal account.\n\nPlease reset your password by clicking the link below (valid for 30 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nRegards,\nTeam DISHA`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e1035;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%); line-height: 48px; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center;">
            🎓
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #1e1035; margin: 12px 0 4px;">DISHA Student Portal</h2>
          <p style="font-size: 13px; color: #64748b; margin: 0;">Password Reset Request</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Hello <strong>${student.name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            We received a request to reset the password for your DISHA Student account. Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #1d4ed8; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
          If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `;

    const emailUser = (process.env.EMAIL_USER || process.env.EMAILUSER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || process.env.EMAILPASS || '').trim();

    if (!emailUser || !emailPass) {
      console.warn(`[DISHA AUTH] EMAIL_USER or EMAIL_PASS missing in .env.`);
      console.log(`[DISHA AUTH] Dev Password Reset URL for ${student.email}: ${resetUrl}`);
      return res.status(500).json({
        status: 'error',
        message: 'Email service is not configured. Please set EMAIL_USER and EMAIL_PASS in your backend .env file.',
        devResetUrl: resetUrl
      });
    }

    try {
      await sendEmail({
        email: student.email,
        subject: 'DISHA - Password Reset Request',
        message,
        html
      });
    } catch (emailErr) {
      console.error('[DISHA AUTH] Failed to send reset email:', emailErr.message);
      console.log(`[DISHA AUTH] Dev Password Reset URL: ${resetUrl}`);
      return res.status(500).json({
        status: 'error',
        message: `Failed to deliver email: ${emailErr.message}. Please check your Gmail address and 16-character App Password.`,
        devResetUrl: resetUrl
      });
    }

    return res.status(200).json({
      status: 'success',
      message: genericSuccessMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using token
 * @route   POST /api/student/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password reset token is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a new password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the plain-text token received from client to match hashed value in DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const student = await Student.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!student) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password reset token is invalid or has expired'
      });
    }

    // Set new password (pre-save hook will hash it)
    student.password = password;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpire = undefined;

    await student.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};
