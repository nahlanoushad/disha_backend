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
    // FCM registration token: the preferred send target. fid stays the device's
    // identity (and the fallback target), so a rotated token just overwrites this.
    fcmToken: {
      type: String,
      default: ''
    },
    platform: {
      type: String,
      default: 'web'
    },
    // false after the student logs out on this device. It stays registered
    // (isActive) for announcements; personal messages only go to logged-in devices.
    loggedIn: {
      type: Boolean,
      default: true
    },
    // false once FCM reports the device as unregistered
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
