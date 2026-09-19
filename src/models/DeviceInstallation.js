import mongoose from 'mongoose';

const deviceInstallationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    fid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    platform: {
      type: String,
      default: 'web'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// We keep multiple browsers/FIDs active per student, but fid itself is globally unique.
const DeviceInstallation = mongoose.model('DeviceInstallation', deviceInstallationSchema);

export default DeviceInstallation;
