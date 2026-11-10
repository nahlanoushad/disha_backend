import mongoose from 'mongoose';

const EntranceExamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Entrance Exam name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Exam name must be at least 2 characters'],
      maxlength: [150, 'Exam name cannot exceed 150 characters']
    },
    conductingAuthority: {
      type: String,
      required: [true, 'Conducting Authority is required'],
      trim: true
    },
    eligibilityCriteria: {
      type: String,
      trim: true,
      default: ''
    },
    applicationProcess: {
      type: String,
      trim: true,
      default: ''
    },
    registrationStartDate: {
      type: Date,
      default: null
    },
    registrationEndDate: {
      type: Date,
      default: null
    },
    examDate: {
      type: Date,
      default: null
    },
    admitCardRelease: {
      type: Date,
      default: null
    },
    counsellingSchedule: {
      type: String,
      trim: true,
      default: ''
    },
    officialWebsite: {
      type: String,
      trim: true,
      default: ''
    },
    importantInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

const EntranceExam = mongoose.model('EntranceExam', EntranceExamSchema, 'entrance_exams');

export default EntranceExam;
