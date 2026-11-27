import crypto from 'crypto';
import Student from '../models/Student.js';
import sendEmail from '../utils/sendEmail.js';
import AppError from '../utils/appError.js';
import { getJwtSecret } from '../utils/jwtSecret.js';

export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

// Only a keyed hash is stored, so a database leak doesn't reveal live codes
const hashOtp = (studentId, otp) =>
  crypto.createHmac('sha256', getJwtSecret()).update(`${studentId}:${otp}`).digest('hex');

/** Seconds the student must still wait before another code can be sent. */
export const secondsUntilResend = (student) => {
  if (!student.otpSentAt) return 0;
  const elapsed = (Date.now() - student.otpSentAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - elapsed));
};

/** Creates a new code (replacing any earlier one) and emails it. */
export const sendVerificationOtp = async (student) => {
  const otp = String(crypto.randomInt(100000, 1000000));

  student.otpHash = hashOtp(student._id, otp);
  student.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  student.otpAttempts = 0;
  student.otpSentAt = new Date();
  await student.save();

  try {
    // The student's name is deliberately left out so nobody can inject text into our emails
    await sendEmail({
      email: student.email,
      subject: 'DISHA - Verify your email',
      message: `Your DISHA verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html: `<p>Your DISHA verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>It expires in ${OTP_TTL_MINUTES} minutes. If you did not sign up, ignore this email.</p>`
    });
  } catch (error) {
    console.error('Error sending verification email:', error.message);
    // Let the student retry straight away
    student.otpSentAt = undefined;
    await student.save();
    throw new AppError('We could not send the verification email. Please try again in a moment.', 502);
  }
};

/**
 * Checks a code and, if correct, marks the student verified. Each code works once.
 * Throws an AppError describing why it failed.
 */
export const verifyStudentOtp = async (email, otp) => {
  const invalid = new AppError('Invalid or expired code. If your email is already verified, sign in.', 400);

  const student = await Student.findOne({ email }).select('+otpHash +otpExpires');
  if (!student || student.isVerified !== false || !student.otpHash) throw invalid;
  if (!student.isActive) throw new AppError('Account is deactivated. Please contact support.', 403);
  if (!student.otpExpires || student.otpExpires.getTime() < Date.now()) {
    throw new AppError('This code has expired. Request a new one.', 400);
  }

  // Count the attempt atomically so parallel guesses can't get around the limit
  const counted = await Student.findOneAndUpdate(
    { _id: student._id, otpHash: student.otpHash, otpAttempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { otpAttempts: 1 } },
    { returnDocument: 'after', projection: { otpAttempts: 1 } }
  );
  if (!counted) throw new AppError('Too many incorrect attempts. Request a new code.', 429);

  const expected = Buffer.from(student.otpHash, 'hex');
  const actual = Buffer.from(hashOtp(student._id, otp), 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) {
    const left = OTP_MAX_ATTEMPTS - counted.otpAttempts;
    throw new AppError(
      left > 0
        ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'Too many incorrect attempts. Request a new code.',
      left > 0 ? 400 : 429
    );
  }

  const verified = await Student.findOneAndUpdate(
    { _id: student._id, otpHash: student.otpHash, isVerified: false },
    {
      $set: { isVerified: true, lastLogin: new Date() },
      $unset: { otpHash: 1, otpExpires: 1, otpAttempts: 1, otpSentAt: 1 }
    },
    { returnDocument: 'after' }
  );
  if (!verified) throw invalid;

  return verified;
};
