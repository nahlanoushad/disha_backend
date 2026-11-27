import { messaging } from '../utils/firebaseAdmin.js';
import DeviceInstallation from '../models/DeviceInstallation.js';
import Student from '../models/Student.js';

export const AUDIENCES = ['all', 'logged_in', 'logged_out'];

// FCM accepts at most 500 messages per sendEach() call
const BATCH_SIZE = 500;

// Errors that mean the device is permanently gone. Anything else (bad payload,
// quota, network) must NOT deactivate devices.
const UNREGISTERED_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/installation-id-not-registered',
  'messaging/invalid-registration-token'
]);

/**
 * Mongo filter for the devices of an audience, limited to active students.
 * `loggedIn: { $ne: false }` also treats older records without the field as logged in.
 */
const deviceFilterFor = (audience, activeStudentIds) => {
  const filter = { isActive: true, studentId: { $in: activeStudentIds } };
  if (audience === 'logged_in') filter.loggedIn = { $ne: false };
  if (audience === 'logged_out') filter.loggedIn = false;
  return filter;
};

/**
 * FCM needs an absolute HTTPS URL for click links. Accepts an https URL, or a path
 * ("/student") joined to FRONTEND_URL. Returns undefined if no valid link can be built.
 */
const toWebpushLink = (url) => {
  if (/^https:\/\//i.test(url)) return url;
  const base = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (url.startsWith('/') && /^https:\/\//i.test(base)) return `${base}${url}`;
  return undefined;
};

/**
 * Builds the message for one device. The browser's Firebase service worker displays
 * the `notification` block itself when the app is in the background.
 */
const buildMessage = (device, payload) => {
  const clickPath = String(payload.url || '/student/exams');
  const link = toWebpushLink(clickPath);

  const message = {
    notification: {
      title: payload.title,
      body: payload.body
    },
    webpush: {
      notification: {
        icon: '/favicon.svg'
      },
      ...(link ? { fcmOptions: { link } } : {})
    },
    data: {
      title: String(payload.title || ''),
      body: String(payload.body || ''),
      click_action: clickPath,
      timestamp: new Date().toISOString(),
      eventType: String(payload.eventType || 'exam_reminder')
    }
  };

  // Prefer the registration token; fall back to the installation ID.
  // (A very long "fid" is a registration token stored by an older registration.)
  if (device.fcmToken) {
    message.token = device.fcmToken;
  } else if (device.fid.length > 50) {
    message.token = device.fid;
  } else {
    message.fid = device.fid;
  }

  return message;
};

export const fcmService = {
  isConfigured() {
    return Boolean(messaging);
  },

  /**
   * Registers (or refreshes) a student's browser. Called after every login.
   */
  async registerDevice(studentId, fid, platform = 'web', fcmToken = '') {
    const device = await DeviceInstallation.findOneAndUpdate(
      { fid },
      {
        studentId,
        platform,
        // Only overwrite a stored token when a new one was actually supplied
        ...(fcmToken ? { fcmToken } : {}),
        isActive: true,
        loggedIn: true,
        lastSeenAt: Date.now()
      },
      { returnDocument: 'after', upsert: true }
    );

    // One token means one browser: drop other records for it, or it would get every push twice
    if (fcmToken) {
      await DeviceInstallation.deleteMany({ fcmToken, _id: { $ne: device._id } });
    }

    return device;
  },

  /**
   * Marks a student's device as logged out. It stays registered so announcements
   * can still reach it, but personal messages stop. Matching on studentId means a
   * device since taken over by another student is not affected.
   */
  async markDeviceLoggedOut(studentId, fid) {
    return DeviceInstallation.findOneAndUpdate(
      { studentId, fid },
      { loggedIn: false },
      { returnDocument: 'after' }
    );
  },

  /**
   * Sends a personal notification (e.g. an exam reminder) to a student's logged-in devices.
   */
  async sendNotificationToStudent(studentId, payload, options = {}) {
    if (!messaging) {
      console.warn('[FCM Service] Messaging not initialized. Skipping send.');
      return { successCount: 0, failureCount: 0, errors: ['Firebase Admin SDK not initialized'] };
    }

    const devices = await DeviceInstallation.find({
      studentId,
      isActive: true,
      loggedIn: { $ne: false }
    });
    if (devices.length === 0) {
      return { successCount: 0, failureCount: 0, errors: ['No active devices found for student'] };
    }

    // Test/Mock mode guard
    if (options.mock === true || process.env.NODE_ENV === 'test') {
      return {
        successCount: options.mockSuccess !== false ? devices.length : 0,
        failureCount: options.mockSuccess !== false ? 0 : devices.length,
        errors: options.mockSuccess !== false ? [] : ['Mock send failure simulated'],
        isMock: true
      };
    }

    return this.sendToDevices(devices, payload);
  },

  /**
   * Sends to a list of devices in batches and deactivates those FCM reports as gone.
   */
  async sendToDevices(devices, payload) {
    let successCount = 0;
    let failureCount = 0;
    const errors = new Set();
    const delivered = [];
    const unregistered = [];

    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE);

      let responses;
      try {
        ({ responses } = await messaging.sendEach(batch.map((device) => buildMessage(device, payload))));
      } catch (error) {
        // The whole batch failed (credentials, network). Count it and carry on.
        console.error('[FCM Service] Batch send failed:', error.message);
        failureCount += batch.length;
        errors.add(error.message);
        continue;
      }

      responses.forEach((response, index) => {
        if (response.success) {
          successCount++;
          delivered.push(batch[index]._id);
          return;
        }
        failureCount++;
        if (response.error?.message) errors.add(response.error.message);
        if (UNREGISTERED_CODES.has(response.error?.code)) unregistered.push(batch[index]._id);
      });
    }

    if (delivered.length > 0) {
      await DeviceInstallation.updateMany({ _id: { $in: delivered } }, { lastSeenAt: new Date() });
    }
    if (unregistered.length > 0) {
      await DeviceInstallation.updateMany({ _id: { $in: unregistered } }, { isActive: false });
      console.log(`[FCM Service] Deactivated ${unregistered.length} unregistered device(s).`);
    }
    if (failureCount > 0) {
      console.warn(`[FCM Service] ${failureCount} message(s) failed:`, [...errors].slice(0, 3).join(' | '));
    }

    return { successCount, failureCount, errors: [...errors].slice(0, 5) };
  },

  /**
   * How many students and devices each audience would reach.
   */
  async getAudienceStats() {
    const activeStudentIds = await Student.distinct('_id', { isActive: true });
    const stats = {};

    for (const audience of AUDIENCES) {
      const filter = deviceFilterFor(audience, activeStudentIds);
      const [devices, students] = await Promise.all([
        DeviceInstallation.countDocuments(filter),
        DeviceInstallation.distinct('studentId', filter)
      ]);
      stats[audience] = { students: students.length, devices };
    }

    return stats;
  },

  /**
   * Sends an announcement to every device in an audience.
   */
  async broadcast(payload, audience = 'all') {
    if (!messaging) {
      const error = new Error(
        'Push notifications are not configured. Set GOOGLE_APPLICATION_CREDENTIALS to a valid Firebase service-account key and restart the server.'
      );
      error.statusCode = 503;
      throw error;
    }

    const activeStudentIds = await Student.distinct('_id', { isActive: true });
    const devices = await DeviceInstallation.find(deviceFilterFor(audience, activeStudentIds)).lean();
    const result = await this.sendToDevices(devices, payload);

    return {
      ...result,
      deviceCount: devices.length,
      recipientCount: new Set(devices.map((device) => String(device.studentId))).size
    };
  }
};

export default fcmService;
