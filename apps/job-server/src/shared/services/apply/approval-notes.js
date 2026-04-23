const HOUR_MS = 60 * 60 * 1000;

function asNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

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

export function stringifyApprovalNotes(noteState) {
  return JSON.stringify({
    reason: noteState.reason || null,
    reminderCount: asNumber(noteState.reminderCount, 0),
    lastReminderAt: noteState.lastReminderAt || null,
    events: Array.isArray(noteState.events) ? noteState.events : [],
  });
}

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
