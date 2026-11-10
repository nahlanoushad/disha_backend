import mongoose from 'mongoose';

const trackedExamSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EntranceExam',
      required: true,
      index: true
    },
    reminderOffsets: {
      type: [Number], // e.g. [7, 3, 1, 0] for 7 days, 3 days, 1 day before, and event day
      default: [7, 3, 1, 0]
    },
    selectedEventTypes: {
      type: [String],
      default: ['application_closing', 'admit_card_release', 'examination', 'result']
    },
    notificationChannels: {
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate tracking per student
trackedExamSchema.index({ studentId: 1, examId: 1 }, { unique: true });

const TrackedExam = mongoose.model('TrackedExam', trackedExamSchema);

export default TrackedExam;

