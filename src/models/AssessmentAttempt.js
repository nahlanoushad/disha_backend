import mongoose from 'mongoose';

const answerItemSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AptitudeQuestion',
      required: true
    },
    questionText: {
      type: String,
      default: ''
    },
    section: {
      type: String,
      default: 'general'
    },
    category: {
      type: String,
      default: 'General'
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    selectedOptions: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    tags: {
      type: [String],
      default: []
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

const courseRecommendationSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    courseName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'General'
    },
    duration: {
      type: String,
      default: ''
    },
    eligibility: {
      type: String,
      default: ''
    },
    feeStructure: {
      type: String,
      default: ''
    },
    expectedSalaryRange: {
      type: String,
      default: ''
    },
    indicativeScore: {
      type: Number,
      default: 80
    },
    matchLevel: {
      type: String,
      enum: ['Top Recommendation', 'Strong Match', 'Good Match', 'Worth Exploring'],
      default: 'Strong Match'
    },
    matchReasons: {
      type: [String],
      default: []
    },
    careerOpportunities: {
      type: [String],
      default: []
    },
    entranceExams: {
      type: [String],
      default: []
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
      default: 'v2.0'
    },
    assessmentType: {
      type: String,
      enum: ['career_discovery', 'riasec'],
      default: 'career_discovery'
    },
    completionStatus: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true
    },
    currentStep: {
      type: Number,
      default: 1
    },
    // Snapshot of student profile at the time of assessment
    studentProfileSnapshot: {
      stream: { type: String, default: '' },
      subjects: { type: [String], default: [] },
      plusTwoPercentage: { type: Number, default: null }
    },
    answers: [answerItemSchema],

    // V2.0 Direct Undergraduate Course Recommendations
    courseRecommendations: [courseRecommendationSchema],

    // Recommended Colleges mapped to top courses
    collegeRecommendations: [
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

    // Summary of top tags and student's identified strengths
    profileSummary: {
      topInterests: { type: [String], default: [] },
      enjoyedSubjects: { type: [String], default: [] },
      workStylePreferences: { type: [String], default: [] },
      strengths: { type: [String], default: [] }
    },

    // Legacy RIASEC Fields (preserved for v1.0 attempts)
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
    abilityScores: {
      logicalReasoning: { score: Number, maxScore: Number, percentage: Number },
      numericalReasoning: { score: Number, maxScore: Number, percentage: Number },
      verbalReasoning: { score: Number, maxScore: Number, percentage: Number },
      analyticalThinking: { score: Number, maxScore: Number, percentage: Number },
      totalScore: { type: Number, default: 0 },
      totalMaxScore: { type: Number, default: 0 },
      overallPercentage: { type: Number, default: 0 }
    },
    ruleBasedRecommendations: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // AI Analysis (Gemini grounded explanations)
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
      studentSummary: {
        type: String,
        default: ''
      },
      whyTheseCourses: {
        type: String,
        default: ''
      },
      learningGuidance: {
        type: String,
        default: ''
      },
      growthAreas: {
        type: String,
        default: ''
      },
      // Legacy fields
      interestInterpretation: { type: String, default: '' },
      strengthsSummary: { type: String, default: '' },
      personalizedExplanation: { type: String, default: '' },
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
