import mongoose from 'mongoose';
import NotificationLog, { NOTIFICATION_CATEGORIES } from '../models/NotificationLog.js';
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
  if (!AUDIENCES.includes(audience)) {
    throw new AppError(`Audience must be one of: ${AUDIENCES.join(', ')}.`, 400);
  }
  // Only same-site paths or https links, so a notification can't open other schemes
  if (actionUrl && !/^(\/(?![/\\])|https:\/\/)/i.test(actionUrl)) {
    throw new AppError('Action URL must start with "/" or "https://".', 400);
  }

  return { title, message, category, actionUrl, audience };
};

const toStatus = ({ deviceCount, successCount, failureCount }) => {
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

    const result = await fcmService.broadcast(
      {
        title: data.title,
        body: data.message,
        url: data.actionUrl || '/student',
        eventType: 'admin_announcement'
      },
      data.audience
    );

    const status = toStatus(result);
    const notification = await NotificationLog.create({
      ...data,
      sentBy: req.admin._id,
      recipientCount: result.recipientCount,
      deviceCount: result.deviceCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      status
    });

    res.status(201).json({
      status: 'success',
      message:
        status === 'no_devices'
          ? 'No devices are registered for this audience, so nothing was sent.'
          : `Delivered to ${result.successCount} of ${result.deviceCount} device(s).`,
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
      NotificationLog.find().sort({ createdAt: -1 }).limit(200).lean(),
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
 * Removes the history entry only; delivered pushes can't be recalled.
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
