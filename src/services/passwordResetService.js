import crypto from 'crypto';
import Student from '../models/Student.js';
import DeviceInstallation from '../models/DeviceInstallation.js';
import sendEmail from '../utils/sendEmail.js';
import AppError from '../utils/appError.js';
import { getJwtSecret } from '../utils/jwtSecret.js';
import { OTP_TTL_MINUTES, OTP_RESEND_SECONDS, OTP_MAX_ATTEMPTS } from './studentOtpService.js';

// Caps how often codes can be requested, which also caps how many guesses are possible
export const RESET_CODES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

// The "reset" prefix means a sign-up verification code can never reset a password
const hashCode = (studentId, code) =>
  crypto.createHmac('sha256', getJwtSecret()).update(`reset:${studentId}:${code}`).digest('hex');

/**
 * Emails a reset code if the address belongs to an active student and the limits
 * allow it. Otherwise does nothing, so callers can answer the same way every time.
 */
export const requestPasswordReset = async (email) => {
  const student = await Student.findOne({ email }).select(
    '+passwordResetSentAt +passwordResetWindowStart +passwordResetCount'
  );
  if (!student || !student.isActive) return;

  const now = Date.now();
  const lastSent = student.passwordResetSentAt?.getTime() || 0;
  if (now - lastSent < OTP_RESEND_SECONDS * 1000) return;

  const windowStart = student.passwordResetWindowStart?.getTime() || 0;
  const isNewWindow = now - windowStart >= HOUR_MS;
  const sentInWindow = isNewWindow ? 0 : student.passwordResetCount || 0;
  if (sentInWindow >= RESET_CODES_PER_HOUR) return;

  const code = String(crypto.randomInt(100000, 1000000));

  // Matching on the previous send time means parallel requests send only one email
  const claimed = await Student.updateOne(
    { _id: student._id, passwordResetSentAt: student.passwordResetSentAt ?? null },
    {
      $set: {
        passwordResetHash: hashCode(student._id, code),
        passwordResetExpires: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
        passwordResetAttempts: 0,
        passwordResetSentAt: new Date(now),
        passwordResetWindowStart: isNewWindow ? new Date(now) : student.passwordResetWindowStart,
        passwordResetCount: sentInWindow + 1
      }
    }
  );
  if (claimed.modifiedCount === 0) return;

  try {
    await sendEmail({
      email: student.email,
      subject: 'DISHA - Reset your password',
      message: `Your DISHA password reset code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not ask for this, ignore this email; your password is unchanged.`,
      html: `<p>Your DISHA password reset code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in ${OTP_TTL_MINUTES} minutes. If you did not ask for this, ignore this email; your password is unchanged.</p>`
    });
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    // Let the student retry straight away; the failed send doesn't count
    await Student.updateOne(
      { _id: student._id },
      { $unset: { passwordResetSentAt: 1 }, $inc: { passwordResetCount: -1 } }
    );
    throw new AppError('We could not send the email. Please try again in a moment.', 502);
  }
};

/**
 * Sets a new password using an emailed code. Each code works once. On success the
 * student's other sessions stop working.
 */
export const resetPasswordWithCode = async (email, code, newPassword) => {
  // One message for every failure, so it doesn't reveal which emails are registered
  const invalid = new AppError(
    'Invalid or expired code. Check it, or request a new one.',
    400
  );

  const student = await Student.findOne({ email }).select(
    '+passwordResetHash +passwordResetExpires'
  );
  if (!student || !student.isActive || !student.passwordResetHash) throw invalid;
  if (!student.passwordResetExpires || student.passwordResetExpires.getTime() < Date.now()) {
    throw invalid;
  }

  // Count the attempt atomically so parallel guesses can't get around the limit
  const counted = await Student.updateOne(
    {
      _id: student._id,
      passwordResetHash: student.passwordResetHash,
      passwordResetAttempts: { $lt: OTP_MAX_ATTEMPTS }
    },
    { $inc: { passwordResetAttempts: 1 } }
  );
  if (counted.modifiedCount === 0) throw invalid;

  const expected = Buffer.from(student.passwordResetHash, 'hex');
  const actual = Buffer.from(hashCode(student._id, code), 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) throw invalid;

  // Use up the code before changing anything, so it can't be used twice
  const claimed = await Student.updateOne(
    { _id: student._id, passwordResetHash: student.passwordResetHash },
    { $unset: { passwordResetHash: 1, passwordResetExpires: 1, passwordResetAttempts: 1 } }
  );
  if (claimed.modifiedCount === 0) throw invalid;

  const account = await Student.findById(student._id).select('+password');
  account.password = newPassword; // hashed by the model before saving
  account.passwordChangedAt = new Date();
  // Receiving the code proves the email address is theirs
  account.isVerified = true;
  await account.save({ validateModifiedOnly: true });

  // Signed-out devices must not keep receiving personal notifications
  await DeviceInstallation.updateMany({ studentId: account._id }, { loggedIn: false });
};
