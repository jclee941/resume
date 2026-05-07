export function toYYYYMM(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).replace(/\./g, '').trim();
}

export function toFieldValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function pushField(fields, name, value) {
  fields.push({ name, value: toFieldValue(value) });
}

export function parseRange(period) {
  const raw = String(period || '');
  const parts = raw.includes('~')
    ? raw.split('~').map((part) => part.trim())
    : raw.split(' - ').map((part) => part.trim());
  const start = toYYYYMM(parts[0] || '');
  const rawEnd = parts[1] || '';
  const isCurrent = rawEnd.includes('현재');
  const end = isCurrent ? '' : toYYYYMM(rawEnd);
  return { start, end, isCurrent };
}
