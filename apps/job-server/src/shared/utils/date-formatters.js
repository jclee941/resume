function normalizeDateParts(date) {
  if (date === null || date === undefined || date === '') return null;

  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: String(date.getFullYear()).padStart(4, '0'),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
    };
  }

  const raw = String(date).trim();
  if (!raw) return null;
  const [year = '', month = '', day = ''] = raw.match(/\d+/g) || [];
  if (!year || !month) return null;

  return {
    year: year.padStart(4, '0'),
    month: month.padStart(2, '0'),
    day: day ? day.padStart(2, '0') : '01',
  };
}

export function formatYYYYMM(date) {
  const parts = normalizeDateParts(date);
  if (!parts) return '';
  return `${parts.year}${parts.month}`;
}

export function formatYYYY_MM(date) {
  const parts = normalizeDateParts(date);
  if (!parts) return '';
  return `${parts.year}-${parts.month}`;
}

export function formatYYYY_MM_DD(date) {
  const parts = normalizeDateParts(date);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parsePeriod(periodString) {
  if (typeof periodString !== 'string' || !periodString.trim()) {
    return { start: '', end: '', startsAt: '', endsAt: null, isCurrent: false };
  }

  const [rawStart = '', rawEnd = ''] = periodString
    .split(/\s*(?:~|-)\s*/)
    .map((part) => part.trim());
  const isCurrent = rawEnd.includes('현재');
  const start = formatYYYYMM(rawStart);
  const end = isCurrent ? '' : formatYYYYMM(rawEnd);

  return {
    start,
    end,
    startsAt: formatYYYY_MM_DD(rawStart),
    endsAt: isCurrent || !rawEnd ? null : formatYYYY_MM_DD(rawEnd),
    isCurrent,
  };
}
