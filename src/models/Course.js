import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Course name must be at least 2 characters'],
      maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    eligibility: {
      type: String,
      trim: true,
      default: ''
    },
    duration: {
      type: String,
      trim: true,
      default: ''
    },
    feeStructure: {
      type: String,
      trim: true,
      default: ''
    },
    admissionProcedure: {
      type: String,
      trim: true,
      default: ''
    },
    entranceExams: {
      type: [String],
      default: []
    },
    careerOpportunities: {
      type: [String],
      default: []
    },
    higherStudyOptions: {
      type: [String],
      default: []
    },
    expectedSalaryRange: {
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

const Course = mongoose.model('Course', CourseSchema);

export default Course;
