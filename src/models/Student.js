import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
    // Extended Academic & Career Guidance Profile
    academicProfile: {
      qualification: { type: String, trim: true, default: '' },
      plusTwoStatus: { type: String, trim: true, default: '' },
      board: { type: String, trim: true, default: '' },
      stream: { type: String, trim: true, default: '' },
      subjects: { type: [String], default: [] },
      passingYear: { type: String, trim: true, default: '' },
      marksPercentage: { type: String, trim: true, default: '' },
      schoolName: { type: String, trim: true, default: '' }
    },
    location: {
      state: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' }
    },
    preferences: {
      interestedStreams: { type: [String], default: [] },
      preferredLocations: { type: [String], default: [] },
      budgetRange: { type: String, trim: true, default: '' },
      preferredDuration: { type: String, trim: true, default: '' }
    },
    interests: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving to database
StudentSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password with stored hash
StudentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', StudentSchema);

export default Student;
