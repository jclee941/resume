import { parsePeriod as parseSharedPeriod } from '../../src/shared/utils/date-formatters.js';

/**
 * @param {string} period - e.g. "2024.03 ~ 현재" or "2014.12 - 2016.12"
 * @returns {{startsAt: string, endsAt: string|null}}
 */
export function parsePeriod(period) {
  const { startsAt, endsAt } = parseSharedPeriod(period);
  return { startsAt, endsAt };
}
