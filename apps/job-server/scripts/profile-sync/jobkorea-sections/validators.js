import { formatYYYYMM, parsePeriod } from '../../../src/shared/utils/date-formatters.js';

/**
 * @param {Date | string | number | null | undefined} dateStr
 * @returns {string}
 */
export function toYYYYMM(dateStr) {
  return formatYYYYMM(dateStr);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function toFieldValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * @param {Array<{ name: string, value: string }>} fields
 * @param {string} name
 * @param {unknown} value
 * @returns {void}
 */
export function pushField(fields, name, value) {
  fields.push({ name, value: toFieldValue(value) });
}

/**
 * @param {string | null | undefined} period
 * @returns {{ start: string, end: string, isCurrent: boolean }}
 */
export function parseRange(period) {
  const { start, end, isCurrent } = parsePeriod(period);
  return { start, end, isCurrent };
}
