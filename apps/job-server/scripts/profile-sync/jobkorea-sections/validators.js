import { formatYYYYMM, parsePeriod } from '../../../src/shared/utils/date-formatters.js';

export function toYYYYMM(dateStr) {
  return formatYYYYMM(dateStr);
}

export function toFieldValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function pushField(fields, name, value) {
  fields.push({ name, value: toFieldValue(value) });
}

export function parseRange(period) {
  const { start, end, isCurrent } = parsePeriod(period);
  return { start, end, isCurrent };
}
