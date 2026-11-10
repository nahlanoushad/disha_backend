import { messaging } from '../utils/firebaseAdmin.js';
import DeviceInstallation from '../models/DeviceInstallation.js';

export const fcmService = {
  /**
   * Registers a Firebase Installation ID to a Student.
   */
  async registerDevice(studentId, fid, platform = 'web') {
    // Upsert logic: if FID exists, update it to belong to this student and set active.
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
   * Deactivates a specific Firebase Installation ID.
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
   */
  async sendNotificationToStudent(studentId, payload) {
    if (!messaging) {
      console.warn('FCM Service: Messaging not initialized. Skipping send.');
      return { successCount: 0, failureCount: 0, errors: ['Firebase Admin SDK not initialized'] };
    }

    const devices = await DeviceInstallation.find({ studentId, isActive: true });
    if (devices.length === 0) {
      return { successCount: 0, failureCount: 0, errors: ['No active devices found for student'] };
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // We loop through devices. Note: `messaging.send` targets one at a time when using `token` field.
    // Wait, the Firebase Installation ID (FID) cannot be used directly in the `token` field for legacy send() without FCM v1 token.
    // However, the standard Firebase Admin v14 expects the client to provide the FCM registration token, which is colloquially derived from the FID lifecycle.
    // The instructions explicitly say: "Do not use deprecated FCM registration-token APIs for the new implementation. Use Firebase Installation IDs/FIDs."
    // Actually, FCM v1 API has a `token` field which is the FCM Registration Token.
    // If the client generated an FID, typically FCM requires the FCM token to send messages. 
    // Wait, the Firebase Admin SDK docs specify sending messages using `token`, `topic`, or `condition`.
    // Wait, the prompt says: "Do NOT use the deprecated token field for this new implementation." 
    // And: "Use Firebase Admin SDK's FID targeting." ... "const message = { notification: { ... }, fid: studentFid };"
    // I will strictly follow the prompt's `fid` payload structure for `messaging().send(message)`.

    for (const device of devices) {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        fid: device.fid
      };

      try {
        const messageId = await messaging.send(message);
        console.log(`Successfully sent message to FID ${device.fid}: ${messageId}`);
        successCount++;
        
        // Update last seen
        device.lastSeenAt = Date.now();
        await device.save();
      } catch (error) {
        console.error(`Error sending message to FID ${device.fid}:`, error.message);
        failureCount++;
        errors.push(error.message);

        // If unregistered or invalid, deactivate it
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-argument' || 
          error.message.includes('not registered') ||
          error.message.includes('invalid')
        ) {
          await this.deactivateInvalidFid(device.fid);
          console.log(`Deactivated invalid/unregistered FID: ${device.fid}`);
        }
      }
    }

    return { successCount, failureCount, errors };
  }
};
