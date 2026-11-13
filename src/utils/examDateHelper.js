/**
 * Exam Date and Status Calculation Utility
 * Evaluates dates strictly within Asia/Kolkata timezone context.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns date as YYYY-MM-DD in Asia/Kolkata timezone
 */
export const getKolkataDateString = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);

  return parts; // 'YYYY-MM-DD'
};

/**
 * Calculate difference in days between two dates using Asia/Kolkata calendar day boundaries
 */
export const diffKolkataDays = (targetDateInput, baseDateInput = new Date()) => {
  const targetStr = getKolkataDateString(targetDateInput);
  const baseStr = getKolkataDateString(baseDateInput);
  if (!targetStr || !baseStr) return null;

  const targetUTC = Date.UTC(
    parseInt(targetStr.slice(0, 4)),
    parseInt(targetStr.slice(5, 7)) - 1,
    parseInt(targetStr.slice(8, 10))
  );
  const baseUTC = Date.UTC(
    parseInt(baseStr.slice(0, 4)),
    parseInt(baseStr.slice(5, 7)) - 1,
    parseInt(baseStr.slice(8, 10))
  );

  return Math.round((targetUTC - baseUTC) / (1000 * 60 * 60 * 24));
};

/**
 * Dynamically computes exam status based on stored dates
 */
export const computeExamStatus = (exam, now = new Date()) => {
  if (!exam) return 'Date Not Announced';

  const regStartDiff = exam.registrationStartDate ? diffKolkataDays(exam.registrationStartDate, now) : null;
  const regEndDiff = exam.registrationEndDate ? diffKolkataDays(exam.registrationEndDate, now) : null;
  const admitDiff = exam.admitCardRelease ? diffKolkataDays(exam.admitCardRelease, now) : null;
  const examDiff = exam.examDate ? diffKolkataDays(exam.examDate, now) : null;

  // Check structured important dates for counselling or result events
  if (Array.isArray(exam.importantDates) && exam.importantDates.length > 0) {
    const resultEvent = exam.importantDates.find((e) => e.eventType === 'result');
    if (resultEvent && resultEvent.date) {
      const resDiff = diffKolkataDays(resultEvent.date, now);
      if (resDiff !== null && resDiff <= 0) {
        // Result is announced, check if counselling is ongoing
        const counselStart = exam.importantDates.find((e) => e.eventType === 'counselling_start');
        const counselEnd = exam.importantDates.find((e) => e.eventType === 'counselling_end');
        if (counselStart && counselStart.date) {
          const cStartDiff = diffKolkataDays(counselStart.date, now);
          const cEndDiff = counselEnd && counselEnd.date ? diffKolkataDays(counselEnd.date, now) : 30;
          if (cStartDiff <= 0 && cEndDiff >= 0) {
            return 'Counselling Ongoing';
          }
        }
        return 'Result Announced';
      }
    }
  }

  // 1. Exam completed
  if (examDiff !== null && examDiff < 0) {
    return 'Examination Completed';
  }

  // 2. Exam is today
  if (examDiff !== null && examDiff === 0) {
    return 'Exam Today';
  }

  // 3. Admit Card released (admit card date passed, but exam has not occurred yet)
  if (admitDiff !== null && admitDiff <= 0 && (examDiff === null || examDiff > 0)) {
    return 'Admit Card Released';
  }

  // 4. Registration period
  if (regEndDiff !== null) {
    if (regEndDiff < 0) {
      // Registration has closed, but admit card / exam is pending
      return 'Application Closed';
    }
    if (regStartDiff === null || regStartDiff <= 0) {
      // Currently inside application window
      if (regEndDiff <= 7) {
        return 'Closing Soon';
      }
      return 'Applications Open';
    }
    if (regStartDiff > 0) {
      return 'Upcoming';
    }
  }

  // 5. Exam in future
  if (examDiff !== null && examDiff > 0) {
    return 'Upcoming';
  }

  return 'Date Not Announced';
};

