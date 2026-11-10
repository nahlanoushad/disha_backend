import mongoose from 'mongoose';

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    section: {
      type: String,
      enum: ['interest', 'ability'],
      required: [true, 'Section (interest/ability) is required'],
      index: true
    },
    type: {
      type: String,
      enum: ['likert', 'multiple_choice'],
      default: 'likert'
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
      // For interest: 'Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional'
      // For ability: 'Logical Reasoning', 'Numerical Reasoning', 'Verbal Reasoning', 'Analytical Thinking'
    },
    options: [
      {
        text: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true }
      }
    ],
    // SECURED: Never exposed to students in public/question endpoints
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
      default: null
    },
    // SECURED: Solution explanation withheld until after official attempt submission
    explanation: {
      type: String,
      select: false,
      default: ''
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    marks: {
      type: Number,
      default: 1
    },
    order: {
      type: Number,
      default: 0
    },
    assessmentVersion: {
      type: String,
      default: 'v1.0',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

aptitudeQuestionSchema.index({ section: 1, category: 1, order: 1 });

const AptitudeQuestion = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);

export default AptitudeQuestion;

