export function parseDate(dateStr) {
  if (!dateStr || dateStr === '현재') return null;
  const [year, month] = dateStr.split('.');
  return `${year}-${month.padStart(2, '0')}-01`;
}
