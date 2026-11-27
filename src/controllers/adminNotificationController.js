import mongoose from 'mongoose';
import NotificationLog, { NOTIFICATION_CATEGORIES } from '../models/NotificationLog.js';
import Student from '../models/Student.js';
import { fcmService, AUDIENCES } from '../services/fcmService.js';
import AppError from '../utils/appError.js';

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const parseBroadcast = (body = {}) => {
  const title = text(body.title);
  const message = text(body.message);
  const category = text(body.category) || 'General';
  const actionUrl = text(body.actionUrl);
  const audience = text(body.audience) || 'all';

  if (!title || !message) throw new AppError('Both title and message are required.', 400);
  if (title.length > 100) throw new AppError('Title cannot exceed 100 characters.', 400);
  if (message.length > 500) throw new AppError('Message cannot exceed 500 characters.', 400);
  if (!NOTIFICATION_CATEGORIES.includes(category)) throw new AppError('Invalid category.', 400);
  const allowed = [...AUDIENCES, 'student'];
  if (!allowed.includes(audience)) {
    throw new AppError(`Audience must be one of: ${allowed.join(', ')}.`, 400);
  }
  const studentId = text(body.studentId);
  if (audience === 'student' && !mongoose.isValidObjectId(studentId)) {
    throw new AppError('Choose a student to send to.', 400);
  }
  // Only same-site paths or https links, so a notification can't open other schemes
  if (actionUrl && !/^(\/(?![/\\])|https:\/\/)/i.test(actionUrl)) {
    throw new AppError('Action URL must start with "/" or "https://".', 400);
  }

  return {
    title,
    message,
    category,
    actionUrl,
    audience,
    ...(audience === 'student' ? { recipientId: studentId } : {})
  };
};

const toStatus = ({ topic, messageId, deviceCount, successCount, failureCount }) => {
  // A topic message either is accepted by FCM or isn't
  if (topic) return messageId ? 'sent' : 'failed';
  if (deviceCount === 0) return 'no_devices';
  if (successCount === 0) return 'failed';
  return failureCount > 0 ? 'partial' : 'sent';
};

/**
 * POST /api/admin/notifications/send
 */
export const sendBroadcast = async (req, res, next) => {
  try {
    const data = parseBroadcast(req.body);

    let student = null;
    if (data.recipientId) {
      student = await Student.findById(data.recipientId).select('name isActive');
      if (!student) throw new AppError('Student not found.', 404);
      if (!student.isActive) throw new AppError('This student account is deactivated.', 400);
    }

    const payload = {
      title: data.title,
      body: data.message,
      url: data.actionUrl || '/student',
      eventType: 'admin_announcement'
    };

    const result = student
      ? await fcmService.sendToOneStudent(student._id, payload)
      : await fcmService.broadcast(payload, data.audience);

    const status = toStatus(result);
    const notification = await NotificationLog.create({
      ...data,
      topic: result.topic || '',
      sentBy: req.admin._id,
      recipientCount: result.recipientCount,
      deviceCount: result.deviceCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      status
    });

    let message = `Delivered to ${result.successCount} of ${result.deviceCount} device(s).`;
    if (status === 'no_devices') {
      message = student
        ? `${student.name} has no logged-in device for push, but can see this in their notification list.`
        : 'No devices are registered for this audience, so no push was sent.';
    } else if (result.topic) {
      message = result.messageId
        ? `Sent to all users through the "${result.topic}" topic.`
        : `Could not send to the "${result.topic}" topic: ${result.errors[0]}`;
      if (result.messageId && result.subscriptionFailures > 0) {
        message += ` Warning: ${result.errors[0]}`;
      }
    }

    res.status(201).json({
      status: 'success',
      message,
      data: { notification, errors: result.errors }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notifications
 * Latest broadcasts, audience sizes, and whether push is configured.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const [notifications, audience] = await Promise.all([
      NotificationLog.find()
        .populate('recipientId', 'name email')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      fcmService.getAudienceStats()
    ]);

    res.status(200).json({
      status: 'success',
      data: { notifications, audience, pushConfigured: fcmService.isConfigured() }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/notifications/:id
 * Removes it from the history and students' lists; delivered pushes can't be recalled.
 */
export const deleteNotification = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError('Invalid notification id.', 400);
    }
    const deleted = await NotificationLog.findByIdAndDelete(req.params.id);
    if (!deleted) throw new AppError('Notification not found.', 404);

    res.status(200).json({ status: 'success', message: 'Notification removed from history.' });
  } catch (error) {
    next(error);
  }
};
