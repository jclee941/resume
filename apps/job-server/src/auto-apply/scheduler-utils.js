const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const DEFAULT_SCHEDULER_CONFIG = {
  cron: '0 9 * * *',
  timezone: 'Asia/Seoul',
  enabled: true,
  preventOverlapping: true,
  timeout: 30 * 60 * 1000,
};

function parseCronField(field, min, max) {
  if (field === '*') {
    return () => true;
  }

  const values = new Set();
  const segments = field
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Invalid cron field: ${field}`);
  }

  for (const segment of segments) {
    const [base, stepRaw] = segment.split('/');
    const step = stepRaw ? Number.parseInt(stepRaw, 10) : 1;
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`Invalid cron step: ${segment}`);
    }

    let rangeStart = min;
    let rangeEnd = max;
    if (base && base !== '*') {
      if (base.includes('-')) {
        const [startRaw, endRaw] = base.split('-');
        rangeStart = Number.parseInt(startRaw, 10);
        rangeEnd = Number.parseInt(endRaw, 10);
      } else {
        const value = Number.parseInt(base, 10);
        rangeStart = value;
        rangeEnd = value;
      }
    }

    if (
      !Number.isInteger(rangeStart) ||
      !Number.isInteger(rangeEnd) ||
      rangeStart < min ||
      rangeEnd > max ||
      rangeStart > rangeEnd
    ) {
      throw new Error(`Invalid cron range: ${segment}`);
    }

    for (let value = rangeStart; value <= rangeEnd; value += step) {
      values.add(value);
    }
  }

  return (value) => values.has(value);
}

export function parseCronExpression(cron) {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron expression: ${cron}`);
  }

  const [minute, hour, day, month, weekday] = fields;
  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    day: parseCronField(day, 1, 31),
    month: parseCronField(month, 1, 12),
    weekday: parseCronField(weekday, 0, 6),
  };
}

function getTimeParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    minute: Number.parseInt(map.minute, 10),
    hour: Number.parseInt(map.hour, 10),
    day: Number.parseInt(map.day, 10),
    month: Number.parseInt(map.month, 10),
    weekday: WEEKDAY_MAP[map.weekday],
  };
}

export function findNextRun(cronMatcher, timezone) {
  const now = new Date();
  const cursor = new Date(now.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  for (let i = 0; i < 60 * 24 * 366; i += 1) {
    const parts = getTimeParts(cursor, timezone);
    if (
      cronMatcher.minute(parts.minute) &&
      cronMatcher.hour(parts.hour) &&
      cronMatcher.day(parts.day) &&
      cronMatcher.month(parts.month) &&
      cronMatcher.weekday(parts.weekday)
    ) {
      return new Date(cursor.getTime());
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return null;
}

export function withTimeout(promise, timeout) {
  if (!timeout || timeout <= 0) {
    return promise;
  }

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Auto-apply timed out after ${timeout}ms`)), timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function markRunFailed(d1Client, id, errorMessage, result) {
  if (!d1Client?.query) {
    return;
  }

  await d1Client.query(
    `
    UPDATE automation_runs
    SET status = 'failed',
        results = ?,
        error_message = ?,
        completed_at = datetime('now')
    WHERE id = ?
    `,
    [JSON.stringify(result || {}), String(errorMessage || 'unknown_error'), id]
  );
}
