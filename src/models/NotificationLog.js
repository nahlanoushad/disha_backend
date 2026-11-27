import mongoose from 'mongoose';

export const NOTIFICATION_CATEGORIES = [
  'Entrance Exams',
  'Medical Admissions',
  'Guidance & Counseling',
  'Academic Alert',
  'Scholarships',
  'College Catalog',
  'General'
];

/**
 * History of admin push broadcasts and their delivery results.
 */
const notificationLogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, default: 'General' },
    actionUrl: { type: String, trim: true, default: '' },
    audience: { type: String, enum: ['all', 'logged_in', 'logged_out'], default: 'all' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    recipientCount: { type: Number, default: 0 }, // students targeted
    deviceCount: { type: Number, default: 0 }, // devices attempted
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['sent', 'partial', 'failed', 'no_devices'],
      required: true
    }
  },
  { timestamps: true }
);

notificationLogSchema.index({ createdAt: -1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
