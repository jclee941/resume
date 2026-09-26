const HOUR_MS = 60 * 60 * 1000;

/**
 * @typedef {{
 *   reason: string | null;
 *   reminderCount: number;
 *   lastReminderAt: string | null;
 *   events: unknown[];
 * }} ApprovalNotesState
 *
 * @typedef {{
 *   maxReminders: number;
 *   reminderIntervalHours: number;
 * }} ReminderConfig
 */

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function asNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

/**
 * @param {string | null | undefined} notes
 * @returns {ApprovalNotesState}
 */
export function parseApprovalNotes(notes) {
  if (!notes) {
    return {
      reason: null,
      reminderCount: 0,
      lastReminderAt: null,
      events: [],
    };
  }

  try {
    const parsed = JSON.parse(notes);
    return {
      reason: parsed.reason || null,
      reminderCount: asNumber(parsed.reminderCount, 0),
      lastReminderAt: parsed.lastReminderAt || null,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return {
      reason: String(notes),
      reminderCount: 0,
      lastReminderAt: null,
      events: [],
    };
  }
}

/**
 * @param {Partial<ApprovalNotesState>} noteState
 * @returns {string}
 */
export function stringifyApprovalNotes(noteState) {
  return JSON.stringify({
    reason: noteState.reason || null,
    reminderCount: asNumber(noteState.reminderCount, 0),
    lastReminderAt: noteState.lastReminderAt || null,
    events: Array.isArray(noteState.events) ? noteState.events : [],
  });
}

/**
 * @param {ApprovalNotesState} notesState
 * @param {number} nowMs
 * @param {ReminderConfig} config
 * @returns {boolean}
 */
export function shouldSendReminder(notesState, nowMs, config) {
  if (notesState.reminderCount >= config.maxReminders) {
    return false;
  }

  const baselineMs = Date.parse(notesState.lastReminderAt || '') || 0;
  if (baselineMs === 0) {
    return true;
  }

  return nowMs - baselineMs >= config.reminderIntervalHours * HOUR_MS;
}
