import User from '../../models/User.js';
import generateToken from '../../utils/generateToken.js';
import sendEmail from '../../utils/sendEmail.js';

// Register a new student
export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Validate inputs
        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide name, email and password'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (user.isVerified) {
                return res.status(409).json({
                    status: 'fail',
                    message: 'User with this email already exists and is verified. Please log in.'
                });
            }
            // If user exists but is not verified, we can update their password/name and generate a new OTP
            user.name = name.trim();
            user.password = password;
        } else {
            // Create a new user
            user = new User({
                name: name.trim(),
                email: normalizedEmail,
                password,
                isVerified: false
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set OTP and expiry (10 minutes from now)
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        await user.save();

        // Send OTP via email
        try {
            await sendEmail({
                email: user.email,
                subject: 'DISHA - Email Verification OTP',
                message: `Your verification OTP is: ${otp}. It will expire in 10 minutes.`,
                html: `<p>Your verification OTP is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`
            });
        } catch (error) {
            console.error('Error sending OTP email:', error);
            // Optionally, we could delete the user or just inform them the email failed
            return res.status(500).json({
                status: 'error',
                message: 'Failed to send verification email. Please try again later.'
            });
        }

        res.status(201).json({
            status: 'success',
            message: 'Registration initiated. Please check your email for the OTP.'
        });
    } catch (error) {
        next(error);
    }
};

// Verify OTP
export const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp, fcmToken } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and OTP'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                status: 'fail',
                message: 'User is already verified'
            });
        }

        if (user.otp !== otp) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid OTP'
            });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(401).json({
                status: 'fail',
                message: 'OTP has expired'
            });
        }

        // Mark as verified and clear OTP fields
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;

        // Save fcmToken if provided
        if (fcmToken) {
            user.fcmToken = fcmToken;
        }

        await user.save();

        // Generate JWT
        const token = generateToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Student login
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user and include password
        const user = await User.findOne({
            email: normalizedEmail
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                status: 'fail',
                message: 'Please verify your email address before logging in'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                status: 'fail',
                message: 'Account is deactivated'
            });
        }

        // Compare password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // Generate JWT
        const token = generateToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    lastLogin: user.lastLogin
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Resend OTP
export const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide an email'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                status: 'fail',
                message: 'User is already verified'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set OTP and expiry (10 minutes from now)
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        await user.save();

        // Send OTP via email
        try {
            await sendEmail({
                email: user.email,
                subject: 'DISHA - Resend Email Verification OTP',
                message: `Your new verification OTP is: ${otp}. It will expire in 10 minutes.`,
                html: `<p>Your new verification OTP is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`
            });
        } catch (error) {
            console.error('Error sending OTP email:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to send verification email. Please try again later.'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'OTP resent successfully. Please check your email.'
        });

    } catch (error) {
        next(error);
    }
};