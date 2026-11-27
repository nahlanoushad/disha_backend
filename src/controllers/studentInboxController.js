import NotificationLog from '../models/NotificationLog.js';
import Student from '../models/Student.js';

const INBOX_LIMIT = 50;

// Announcements go to everyone; a message for one student is visible only to them
const visibleTo = (studentId) => ({
  $or: [
    { audience: { $in: ['all', 'logged_in', 'logged_out'] } },
    { audience: 'student', recipientId: studentId }
  ]
});

// Anything newer than this is unread. New accounts don't start with old messages unread.
const unreadSince = (student) => student.notificationsSeenAt || student.createdAt;

/**
 * GET /api/student/notifications
 * The signed-in student's notification list, newest first.
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const since = unreadSince(req.student);
    const filter = visibleTo(req.student._id);

    const [items, unreadCount] = await Promise.all([
      NotificationLog.find(filter)
        // Only student-facing fields: never delivery statistics or the sender
        .select('title message category actionUrl audience createdAt')
        .sort({ createdAt: -1 })
        .limit(INBOX_LIMIT)
        .lean(),
      NotificationLog.countDocuments({ ...filter, createdAt: { $gt: since } })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount,
        notifications: items.map(({ audience, ...item }) => ({
          ...item,
          isPersonal: audience === 'student',
          isUnread: item.createdAt > since
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/notifications/seen   { upTo: <date of newest notification shown> }
 */
export const markNotificationsSeen = async (req, res, next) => {
  try {
    // Never move past "now", so later messages can't be marked read in advance
    const requested = new Date(req.body?.upTo || Date.now());
    const upTo = Number.isNaN(requested.getTime())
      ? new Date()
      : new Date(Math.min(requested.getTime(), Date.now()));

    // $max keeps the newest value if requests arrive out of order
    await Student.updateOne({ _id: req.student._id }, { $max: { notificationsSeenAt: upTo } });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};
