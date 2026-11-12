import mongoose from 'mongoose';

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    // Flexible section grouping: 'academic_background', 'subject_interests', 'career_interests', 'work_preferences', 'strengths', etc.
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      index: true
    },
    // Assessment type: 'career_discovery' (v2.0 course discovery) or 'riasec' (legacy v1.0)
    assessmentType: {
      type: String,
      enum: ['career_discovery', 'riasec'],
      default: 'career_discovery',
      index: true
    },
    // Selection type: single select (radio) or multiple select (checkbox)
    answerType: {
      type: String,
      enum: ['single_choice', 'multiple_choice'],
      default: 'single_choice'
    },
    // Admin publication status: 'draft', 'published', 'archived'
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    // Legacy support
    type: {
      type: String,
      default: 'single_choice'
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      index: true
    },
    options: [
      {
        text: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
        // Recommendation tags used by course matching engine (e.g. ['technology', 'software', 'pcm'])
        tags: {
          type: [String],
          default: []
        }
      }
    ],
    // SECURED: For optional cognitive reasoning items if used
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
      default: null
    },
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
      default: 'v2.0',
      index: true
    },
    publishedVersion: {
      type: String,
      default: 'v2.0'
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

aptitudeQuestionSchema.index({ assessmentType: 1, status: 1, order: 1 });
aptitudeQuestionSchema.index({ section: 1, order: 1 });

const AptitudeQuestion = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);

export default AptitudeQuestion;
