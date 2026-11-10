import Student from '../../models/Student.js';
import generateToken from '../../utils/generateToken.js';

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
    location: student.location || {
      state: '',
      district: '',
      city: ''
    },
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
        state: location.state !== undefined ? String(location.state).trim() : (student.location?.state || ''),
        district: location.district !== undefined ? String(location.district).trim() : (student.location?.district || ''),
        city: location.city !== undefined ? String(location.city).trim() : (student.location?.city || '')
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
