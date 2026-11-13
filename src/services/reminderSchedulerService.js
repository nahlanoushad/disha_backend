import TrackedExam from '../models/TrackedExam.js';
import ReminderDelivery from '../models/ReminderDelivery.js';
import EntranceExam from '../models/EntranceExam.js';
import Student from '../models/Student.js';
import { fcmService } from './fcmService.js';
import { smsService } from './smsService.js';
import { getKolkataDateString, diffKolkataDays } from '../utils/examDateHelper.js';

export const reminderSchedulerService = {
  timerId: null,
  initialTimerId: null,
  isRunning: false,
  isExecuting: false,
  lastRunTimestamp: null,
  lastRunSummary: null,

  /**
   * Helper to extract all distinct event dates from an exam record
   */
  extractExamEvents(exam) {
    const events = [];
    const seenEventKeys = new Set();

    // 1. Process structured importantDates array
    if (Array.isArray(exam.importantDates) && exam.importantDates.length > 0) {
      for (const item of exam.importantDates) {
        if (!item.date || !item.eventType) continue;
        const dateStr = getKolkataDateString(item.date);
        const key = `${item.eventType}_${dateStr}`;
        if (!seenEventKeys.has(key)) {
          seenEventKeys.add(key);
          events.push({
            eventType: item.eventType,
            title: item.title || item.eventType,
            date: item.date
          });
        }
      }
    }

    // 2. Fall back to / supplement with top-level date fields if not already captured
    if (exam.registrationEndDate) {
      const dateStr = getKolkataDateString(exam.registrationEndDate);
      const key = `application_closing_${dateStr}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        events.push({
          eventType: 'application_closing',
          title: 'Application Deadline',
          date: exam.registrationEndDate
        });
      }
    }

    if (exam.admitCardRelease) {
      const dateStr = getKolkataDateString(exam.admitCardRelease);
      const key = `admit_card_release_${dateStr}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        events.push({
          eventType: 'admit_card_release',
          title: 'Admit Card Release',
          date: exam.admitCardRelease
        });
      }
    }

    if (exam.examDate) {
      const dateStr = getKolkataDateString(exam.examDate);
      const key = `examination_${dateStr}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        events.push({
          eventType: 'examination',
          title: 'Examination Date',
          date: exam.examDate
        });
      }
    }

    return events;
  },

  /**
   * Scan all active tracked exams, check for due reminders on asOfDate, and dispatch safely.
   * Uses unique idempotency key: Student + eventKey + channel to prevent duplicates.
   * @param {Date} [asOfDate=new Date()] - Reference date in Asia/Kolkata
   * @param {object} [options={}] - Options (e.g. { mock: true })
   */
  async checkAndDispatchReminders(asOfDate = new Date(), options = {}) {
    if (this.isExecuting) {
      console.log('[Reminder Scheduler] Previous check cycle is still executing. Skipping duplicate trigger.');
      return { status: 'already_running', timestamp: new Date().toISOString() };
    }

    this.isExecuting = true;

    try {
      const todayKolkata = getKolkataDateString(asOfDate);
      console.log(`[Reminder Scheduler] Starting check for ${todayKolkata} (Asia/Kolkata)...`);

      const trackedExams = await TrackedExam.find()
        .populate('examId')
        .populate('studentId', 'name email phone');

      let evaluatedCount = 0;
      let deliveredCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const item of trackedExams) {
        if (!item.examId || !item.studentId) {
          continue;
        }

        evaluatedCount++;
        const exam = item.examId;
        const student = item.studentId;

        // Extract all candidate date events
        const events = this.extractExamEvents(exam);

        // Check each event against student's configured reminder offsets
        for (const event of events) {
          if (!event.date) continue;

          // Verify if student selected this event type
          if (
            item.selectedEventTypes &&
            item.selectedEventTypes.length > 0 &&
            !item.selectedEventTypes.includes(event.eventType)
          ) {
            continue;
          }

          const eventDateStr = getKolkataDateString(event.date);
          const diffDays = diffKolkataDays(event.date, asOfDate);

          if (diffDays === null || diffDays < 0) {
            // Event has already passed relative to asOfDate
            continue;
          }

          // Check if diffDays matches any configured offset (e.g. 7, 3, 1, 0)
          const matchedOffset = item.reminderOffsets.find((offset) => offset === diffDays);

          if (matchedOffset !== undefined) {
            // Construct unique idempotency eventKey
            const eventKey = `${exam._id}_${event.eventType}_${eventDateStr}_${matchedOffset}`;

            // Format reminder notification content
            let title = '';
            let body = '';

            if (matchedOffset === 0) {
              title = `Important: ${exam.name} ${event.title} is TODAY!`;
              body = `Today (${eventDateStr}) is the scheduled ${event.title} for ${exam.name}. Log in to review instructions.`;
            } else if (matchedOffset === 1) {
              title = `Reminder: ${exam.name} ${event.title} is TOMORROW!`;
              body = `Tomorrow (${eventDateStr}) is the ${event.title} for ${exam.name}. Ensure all preparations are complete.`;
            } else {
              title = `Upcoming: ${exam.name} ${event.title}`;
              body = `${exam.name} ${event.title} is in ${matchedOffset} days on ${eventDateStr}.`;
            }

            // 1. Dispatch Push Notification via FCM
            if (item.notificationChannels?.push !== false) {
              try {
                // Check idempotency in DB
                const existingRecord = await ReminderDelivery.findOne({
                  studentId: student._id,
                  eventKey,
                  channel: 'push'
                });

                if (existingRecord) {
                  skippedCount++;
                } else {
                  console.log(`[Reminder Scheduler] Sending FCM push to ${student.name || student._id} for ${eventKey}...`);
                  const fcmResult = await fcmService.sendNotificationToStudent(
                    student._id,
                    {
                      title,
                      body,
                      eventType: event.eventType,
                      url: '/student/exams'
                    },
                    options
                  );

                  await ReminderDelivery.create({
                    studentId: student._id,
                    examId: exam._id,
                    eventKey,
                    eventType: event.eventType,
                    eventDate: event.date,
                    offsetDays: matchedOffset,
                    channel: 'push',
                    status: fcmResult?.successCount > 0 ? 'sent' : 'failed',
                    messageTitle: title,
                    messageBody: body,
                    errorDetails: fcmResult?.errors?.join(', ') || ''
                  });

                  if (fcmResult?.successCount > 0) deliveredCount++;
                  else skippedCount++;
                }
              } catch (err) {
                // Handle duplicate key error gracefully if concurrent race
                if (err.code === 11000) {
                  skippedCount++;
                } else {
                  console.error(`[Reminder Scheduler] Push dispatch error for ${student._id}:`, err.message);
                  errorCount++;
                }
              }
            }

            // 2. Dispatch SMS Notification if enabled
            if (item.notificationChannels?.sms === true && student.phone) {
              try {
                const existingSms = await ReminderDelivery.findOne({
                  studentId: student._id,
                  eventKey,
                  channel: 'sms'
                });

                if (existingSms) {
                  skippedCount++;
                } else {
                  const smsResult = await smsService.sendSms(
                    student.phone,
                    `${title}\n${body}`,
                    options
                  );

                  let deliveryStatus = 'skipped';
                  if (smsResult.success) {
                    deliveryStatus = 'sent';
                  } else if (smsResult.reason === 'PROVIDER_NOT_CONFIGURED') {
                    deliveryStatus = 'skipped';
                  } else {
                    deliveryStatus = 'failed';
                  }

                  await ReminderDelivery.create({
                    studentId: student._id,
                    examId: exam._id,
                    eventKey,
                    eventType: event.eventType,
                    eventDate: event.date,
                    offsetDays: matchedOffset,
                    channel: 'sms',
                    status: deliveryStatus,
                    messageTitle: title,
                    messageBody: body,
                    errorDetails: smsResult.reason || smsResult.error || ''
                  });

                  if (smsResult.success) deliveredCount++;
                  else skippedCount++;
                }
              } catch (smsErr) {
                if (smsErr.code === 11000) {
                  skippedCount++;
                } else {
                  console.error(`[Reminder Scheduler] SMS dispatch error for ${student._id}:`, smsErr.message);
                  errorCount++;
                }
              }
            }
          }
        }
      }

      const summary = {
        status: 'completed',
        asOfDate: todayKolkata,
        evaluatedCount,
        deliveredCount,
        skippedCount,
        errorCount,
        timestamp: new Date().toISOString()
      };

      this.lastRunTimestamp = summary.timestamp;
      this.lastRunSummary = summary;

      console.log(`[Reminder Scheduler] Completed. Evaluated: ${evaluatedCount}, Delivered: ${deliveredCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

      return summary;
    } finally {
      this.isExecuting = false;
    }
  },

  /**
   * Start the recurring background scheduler worker
   * Guarantees singleton execution (will not start multiple times)
   * @param {object} config - Configuration options
   * @param {number} config.checkIntervalMs - Frequency of check (default: 1 hour)
   * @param {number} config.initialDelayMs - Initial delay before first check (default: 5000ms)
   */
  start({ checkIntervalMs = 3600000, initialDelayMs = 5000 } = {}) {
    if (this.isRunning) {
      console.log('[Reminder Scheduler] Worker is already running. Duplicate start ignored.');
      return;
    }

    this.isRunning = true;
    console.log(`[Reminder Scheduler] Starting background worker (Interval: ${checkIntervalMs / 60000} mins, Initial Delay: ${initialDelayMs / 1000}s)...`);

    // Initial check after warm-up delay
    this.initialTimerId = setTimeout(async () => {
      try {
        await this.checkAndDispatchReminders();
      } catch (err) {
        console.error('[Reminder Scheduler] Error in initial run:', err.message);
      }
    }, initialDelayMs);

    // Periodic check loop
    this.timerId = setInterval(async () => {
      try {
        await this.checkAndDispatchReminders();
      } catch (err) {
        console.error('[Reminder Scheduler] Error in periodic run:', err.message);
      }
    }, checkIntervalMs);
  },

  /**
   * Stop the recurring background scheduler worker cleanly
   */
  stop() {
    if (this.initialTimerId) {
      clearTimeout(this.initialTimerId);
      this.initialTimerId = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.isExecuting = false;
    console.log('[Reminder Scheduler] Worker stopped.');
  },

  /**
   * Status check helper
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isExecuting: this.isExecuting,
      lastRunTimestamp: this.lastRunTimestamp,
      lastRunSummary: this.lastRunSummary
    };
  }
};

export default reminderSchedulerService;
