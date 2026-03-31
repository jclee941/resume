export function parseDate(dateStr) {
  if (!dateStr || dateStr === '현재') return null;
  const [year, month] = dateStr.split('.');
  return `${year}-${month.padStart(2, '0')}-01`;
}

export function previewChanges(sourceData, platforms, mapper) {
  const preview = {};
  for (const platform of platforms) {
    preview[platform] = mapper(sourceData, platform);
  }
  return { success: true, preview };
}
