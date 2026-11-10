import mongoose from 'mongoose';

const answerItemSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AptitudeQuestion',
      required: true
    },
    section: {
      type: String,
      enum: ['interest', 'ability'],
      required: true
    },
    category: {
      type: String,
      required: true
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: null
    },
    marksAwarded: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    assessmentVersion: {
      type: String,
      default: 'v1.0'
    },
    completionStatus: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true
    },
    currentStep: {
      type: Number,
      default: 1 // 1: Intro, 2: Interest, 3: Ability, 4: Review, 5: Completed
    },
    answers: [answerItemSchema],

    // Deterministic RIASEC Interest Scores
    interestScores: {
      Realistic: { score: Number, maxScore: Number, percentage: Number },
      Investigative: { score: Number, maxScore: Number, percentage: Number },
      Artistic: { score: Number, maxScore: Number, percentage: Number },
      Social: { score: Number, maxScore: Number, percentage: Number },
      Enterprising: { score: Number, maxScore: Number, percentage: Number },
      Conventional: { score: Number, maxScore: Number, percentage: Number }
    },
    topInterests: {
      type: [String],
      default: []
    },
    riasecCode: {
      type: String,
      default: ''
    },

    // Deterministic Ability Assessment Scores
    abilityScores: {
      logicalReasoning: { score: Number, maxScore: Number, percentage: Number },
      numericalReasoning: { score: Number, maxScore: Number, percentage: Number },
      verbalReasoning: { score: Number, maxScore: Number, percentage: Number },
      analyticalThinking: { score: Number, maxScore: Number, percentage: Number },
      totalScore: { type: Number, default: 0 },
      totalMaxScore: { type: Number, default: 0 },
      overallPercentage: { type: Number, default: 0 }
    },

    // Factual Rule-Based Recommendations (Direct from MongoDB Courses & Colleges)
    ruleBasedRecommendations: {
      recommendedCourses: [
        {
          courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
          courseName: String,
          category: String,
          duration: String,
          indicativeScore: Number,
          matchReasons: [String]
        }
      ],
      recommendedColleges: [
        {
          collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
          collegeName: String,
          matchedCourse: String,
          district: String,
          state: String,
          type: String,
          matchReasons: [String]
        }
      ],
      strengths: [String],
      improvementAreas: [String],
      careerFamilies: [
        {
          title: String,
          description: String,
          suitableRoles: [String]
        }
      ]
    },

    // Gemini AI Analysis and Guidance
    aiAnalysis: {
      status: {
        type: String,
        enum: ['available', 'unavailable', 'failed'],
        default: 'unavailable'
      },
      modelUsed: {
        type: String,
        default: ''
      },
      interestInterpretation: {
        type: String,
        default: ''
      },
      strengthsSummary: {
        type: String,
        default: ''
      },
      growthAreas: {
        type: String,
        default: ''
      },
      learningGuidance: {
        type: String,
        default: ''
      },
      personalizedExplanation: {
        type: String,
        default: ''
      },
      generatedAt: {
        type: Date,
        default: null
      },
      errorMessage: {
        type: String,
        default: ''
      }
    },

    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

assessmentAttemptSchema.index({ studentId: 1, completionStatus: 1 });
assessmentAttemptSchema.index({ studentId: 1, createdAt: -1 });

const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

export default AssessmentAttempt;

