import { fcmService } from '../services/fcmService.js';

/**
 * Register a device FID for the authenticated student
 */
export const registerDevice = async (req, res) => {
  try {
    // req.student is attached by protectStudent middleware
    const studentId = req.student._id;
    const { fid, platform } = req.body;

    if (!fid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Firebase Installation ID (fid) is required.'
      });
    }

    const device = await fcmService.registerDevice(studentId, fid, platform);

    res.status(200).json({
      status: 'success',
      message: 'Device registered successfully for notifications.',
      data: {
        device
      }
    });
  } catch (error) {
    console.error('Error in registerDevice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register device.'
    });
  }
};

/**
 * Deactivate a device FID for the authenticated student
 */
export const deactivateDevice = async (req, res) => {
  try {
    const studentId = req.student._id;
    const { fid } = req.body;

    if (!fid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Firebase Installation ID (fid) is required.'
      });
    }

    const device = await fcmService.deactivateDevice(studentId, fid);

    if (!device) {
      return res.status(404).json({
        status: 'fail',
        message: 'Device not found or does not belong to this student.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Device deactivated successfully.'
    });
  } catch (error) {
    console.error('Error in deactivateDevice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate device.'
    });
  }
};

/**
 * Test notification endpoint (Development only)
 * Sends a notification to all active devices of the authenticated student.
 */
export const testNotification = async (req, res) => {
  try {
    const studentId = req.student._id;
    
    const payload = {
      title: 'DISHA Test Notification',
      body: 'Your DISHA push notification setup is working successfully.'
    };

    const result = await fcmService.sendNotificationToStudent(studentId, payload);

    res.status(200).json({
      status: 'success',
      message: `Test notification process completed.`,
      data: {
        result
      }
    });
  } catch (error) {
    console.error('Error in testNotification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification.'
    });
  }
};
