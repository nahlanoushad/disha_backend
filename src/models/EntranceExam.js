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
    streamCategory: {
      type: String,
      trim: true,
      default: 'General'
    },
    examLevel: {
      type: String,
      enum: ['National', 'State', 'University', 'Other'],
      default: 'National'
    },
    relatedCourses: {
      type: [String],
      default: []
    },
    examPattern: {
      mode: { type: String, default: '' },
      duration: { type: String, default: '' },
      totalMarks: { type: Number, default: null },
      numberOfQuestions: { type: Number, default: null },
      markingScheme: { type: String, default: '' }
    },
    syllabusSummary: {
      type: String,
      trim: true,
      default: ''
    },
    applicationFee: {
      type: String,
      trim: true,
      default: ''
    },
    verificationStatus: {
      type: String,
      enum: ['verified', 'pending_verification'],
      default: 'verified'
    },
    verificationSource: {
      type: String,
      trim: true,
      default: ''
    },
    importantDates: [
      {
        eventType: {
          type: String,
          enum: [
            'application_opening',
            'application_closing',
            'correction_window',
            'admit_card_release',
            'examination',
            'answer_key',
            'result',
            'counselling_start',
            'counselling_end',
            'other'
          ],
          required: true
        },
        title: {
          type: String,
          required: true,
          trim: true
        },
        date: {
          type: Date,
          required: true
        },
        description: {
          type: String,
          trim: true,
          default: ''
        },
        isTentative: {
          type: Boolean,
          default: false
        },
        officialSourceUrl: {
          type: String,
          trim: true,
          default: ''
        }
      }
    ],
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
