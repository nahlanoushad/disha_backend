import mongoose from 'mongoose';

const reminderDeliverySchema = new mongoose.Schema(
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
    eventKey: {
      type: String, // format: `${examId}_${eventType}_${dateStr}_${offsetDays}`
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true
    },
    eventDate: {
      type: Date,
      required: true
    },
    offsetDays: {
      type: Number,
      required: true
    },
    channel: {
      type: String,
      enum: ['push', 'sms'],
      default: 'push'
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'sent'
    },
    messageTitle: {
      type: String,
      default: ''
    },
    messageBody: {
      type: String,
      default: ''
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    errorDetails: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Idempotency constraint: each unique student + eventKey + channel can only be recorded once
reminderDeliverySchema.index({ studentId: 1, eventKey: 1, channel: 1 }, { unique: true });

const ReminderDelivery = mongoose.model('ReminderDelivery', reminderDeliverySchema);

export default ReminderDelivery;

