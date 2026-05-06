/**
 * @param {string} period - e.g. "2024.03 ~ 현재" or "2014.12 - 2016.12"
 * @returns {{startsAt: string, endsAt: string|null}}
 */
export function parsePeriod(period) {
  if (typeof period !== 'string' || !period.trim()) {
    return { startsAt: '', endsAt: null };
  }
  const sep = period.includes('~') ? '~' : ' - ';
  const parts = period.split(sep).map((p) => p.trim());
  const startsAt = `${parts[0].replace('.', '-')}-01`;
  let endsAt = null;
  if (parts[1] && parts[1] !== '현재') {
    endsAt = `${parts[1].replace('.', '-')}-01`;
  }
  return { startsAt, endsAt };
}
