import Student from '../../models/Student.js';
import generateToken from '../../utils/generateToken.js';
import AppError from '../../utils/appError.js';
import { isEmailConfigured } from '../../utils/sendEmail.js';
import { requestPasswordReset, resetPasswordWithCode } from '../../services/passwordResetService.js';
import { fcmService } from '../../services/fcmService.js';
import {
  sendVerificationOtp,
  verifyStudentOtp,
  secondsUntilResend,
  OTP_TTL_MINUTES,
  OTP_RESEND_SECONDS
} from '../../services/studentOtpService.js';

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

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const issueToken = (student) =>
  generateToken({ id: student._id, email: student.email, role: 'student' });

/**
 * @desc    Student registration. Emails a code that must be confirmed before sign-in.
 * @route   POST /api/student/auth/register
 * @access  Public
 */
export const registerStudent = async (req, res, next) => {
  try {
    const name = text(req.body.name);
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const phone = text(req.body.phone);

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name, email, and password are required'
      });
    }

    let student = await Student.findOne({ email }).select('+otpSentAt');

    if (student && student.isVerified !== false) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    if (student) {
      // Signed up earlier but never verified: take the new details and send a fresh code
      const wait = secondsUntilResend(student);
      if (wait > 0) {
        return next(new AppError(`A code was just sent. Please wait ${wait} seconds and try again.`, 429));
      }
      student.set({ name, password, phone });
    } else {
      student = new Student({ name, email, password, phone, isVerified: false });
    }

    try {
      await student.validate();
    } catch (error) {
      return next(new AppError(Object.values(error.errors || {})[0]?.message || error.message, 400));
    }

    await sendVerificationOtp(student);

    res.status(201).json({
      status: 'success',
      message: 'Verification code sent to your email.',
      data: {
        email: student.email,
        verificationRequired: true,
        expiresInMinutes: OTP_TTL_MINUTES
      }
    });
  } catch (error) {
    // Two sign-ups for the same email at the same moment
    if (error.code === 11000) return next(new AppError('Email is already registered', 400));
    next(error);
  }
};

/**
 * @desc    Confirm the emailed code, save this device's FCM token, and sign in
 * @route   POST /api/student/auth/verify-otp
 * @access  Public
 */
export const verifyStudentEmail = async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase();
    const otp = text(req.body.otp);

    if (!email || !/^\d{6}$/.test(otp)) {
      return next(new AppError('Email and the 6-digit code are required', 400));
    }

    const student = await verifyStudentOtp(email, otp);

    // Push registration is optional: a problem here must not block verification
    const fcmToken = text(req.body.fcmToken);
    const fid = text(req.body.fid);
    let deviceRegistered = false;

    if (fcmToken || fid) {
      try {
        await fcmService.registerDevice(
          student._id,
          fid || fcmToken,
          text(req.body.platform) || 'web',
          fcmToken
        );
        deviceRegistered = true;
      } catch (error) {
        console.error('Could not register device during verification:', error.message);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      token: issueToken(student),
      data: {
        student: formatStudentResponse(student),
        deviceRegistered
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Email a new verification code
 * @route   POST /api/student/auth/resend-otp
 * @access  Public
 */
export const resendStudentOtp = async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase();
    if (!email) return next(new AppError('Email is required', 400));

    const student = await Student.findOne({ email }).select('+otpSentAt');

    if (student && student.isActive && student.isVerified === false) {
      const wait = secondsUntilResend(student);
      if (wait > 0) {
        return res.status(429).json({
          status: 'fail',
          message: `Please wait ${wait} seconds before requesting another code.`,
          retryAfter: wait
        });
      }
      await sendVerificationOtp(student);
    }

    // Same answer for unknown or already verified emails
    res.status(200).json({
      status: 'success',
      message: 'If this email is awaiting verification, a new code has been sent.',
      retryAfter: OTP_RESEND_SECONDS
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

    // Checked after the password so only the account owner learns this
    if (student.isVerified === false) {
      return res.status(403).json({
        status: 'fail',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in.'
      });
    }

    // Update last login
    student.lastLogin = new Date();
    await student.save({ validateBeforeSave: false });

    // Generate JWT token with role explicitly set to 'student'
    const token = issueToken(student);

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
 * @desc    Email a password reset code
 * @route   POST /api/student/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase();
    if (!email) return next(new AppError('Email is required', 400));

    // Checked first so the answer is the same for every address
    if (!isEmailConfigured()) {
      return next(new AppError('Password reset is unavailable: email is not configured.', 503));
    }

    await requestPasswordReset(email);

    // Never say whether the address is registered, and never return the code
    res.status(200).json({
      status: 'success',
      message: 'If an account exists for this email, a reset code has been sent.',
      retryAfter: OTP_RESEND_SECONDS,
      expiresInMinutes: OTP_TTL_MINUTES
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set a new password using the emailed code
 * @route   POST /api/student/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase();
    const otp = text(req.body.otp);
    // Passwords are not trimmed: registration and login use them as typed
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return next(new AppError('Email and the 6-digit code are required', 400));
    }
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters', 400));
    }
    // The hashing algorithm ignores anything past 72 bytes
    if (Buffer.byteLength(password) > 72) {
      return next(new AppError('Password is too long (72 characters maximum)', 400));
    }

    await resetPasswordWithCode(email, otp, password);

    res.status(200).json({
      status: 'success',
      message: 'Password updated. Sign in with your new password.'
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
