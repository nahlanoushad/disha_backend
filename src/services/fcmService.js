import { messaging } from '../utils/firebaseAdmin.js';
import DeviceInstallation from '../models/DeviceInstallation.js';

export const fcmService = {
  /**
   * Registers a Firebase Installation ID or Registration Token to a Student.
   */
  async registerDevice(studentId, fid, platform = 'web') {
    const device = await DeviceInstallation.findOneAndUpdate(
      { fid },
      {
        studentId,
        platform,
        isActive: true,
        lastSeenAt: Date.now()
      },
      { new: true, upsert: true }
    );
    return device;
  },

  /**
   * Deactivates a specific device for a student.
   */
  async deactivateDevice(studentId, fid) {
    const device = await DeviceInstallation.findOneAndUpdate(
      { studentId, fid },
      { isActive: false },
      { new: true }
    );
    return device;
  },

  /**
   * Deactivates an FID based purely on the FID string (used when Firebase throws unregistered).
   */
  async deactivateInvalidFid(fid) {
    await DeviceInstallation.findOneAndUpdate(
      { fid },
      { isActive: false }
    );
  },

  /**
   * Sends a notification to all active devices of a specific student.
   * Compatible with foreground handlers and background Service Workers.
   */
  async sendNotificationToStudent(studentId, payload, options = {}) {
    if (!messaging) {
      console.warn('[FCM Service] Messaging not initialized. Skipping send.');
      return { successCount: 0, failureCount: 0, errors: ['Firebase Admin SDK not initialized'] };
    }

    const devices = await DeviceInstallation.find({ studentId, isActive: true });
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

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const device of devices) {
      // Build foreground and background compatible payload
      const message = {
        notification: {
          title: payload.title,
          body: payload.body
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/favicon.ico',
            badge: payload.badge || '/favicon.ico',
            requireInteraction: false
          },
          fcmOptions: {
            link: payload.url || '/student/exams'
          }
        },
        data: {
          title: String(payload.title || ''),
          body: String(payload.body || ''),
          click_action: String(payload.url || '/student/exams'),
          timestamp: new Date().toISOString(),
          eventType: String(payload.eventType || 'exam_reminder')
        }
      };

      // Support FID targeting (Firebase Installation ID) or Token targeting
      if (device.fid.length > 50) {
        message.token = device.fid;
      } else {
        message.fid = device.fid;
      }

      try {
        const messageId = await messaging.send(message);
        console.log(`[FCM Service] Successfully sent message to FID ${device.fid.slice(0, 10)}...: ${messageId}`);
        successCount++;

        // Update last seen
        device.lastSeenAt = Date.now();
        await device.save();
      } catch (error) {
        console.error(`[FCM Service] Error sending message to FID ${device.fid.slice(0, 10)}...:`, error.message);
        failureCount++;
        errors.push(error.message);

        // Check if device is unregistered, invalid, or expired
        const errLower = (error.message || '').toLowerCase();
        const isInvalid =
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/installation-id-not-registered' ||
          error.code === 'messaging/invalid-argument' ||
          errLower.includes('not registered') ||
          errLower.includes('notregistered') ||
          errLower.includes('invalid');

        if (isInvalid) {
          await this.deactivateInvalidFid(device.fid);
          console.log(`[FCM Service] Deactivated invalid/unregistered FID: ${device.fid.slice(0, 10)}...`);
        }
      }
    }

    return { successCount, failureCount, errors };
  }
};

export default fcmService;
