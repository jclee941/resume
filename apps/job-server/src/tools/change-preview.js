export function previewChanges(sourceData, platforms, mapper) {
  const preview = {};
  for (const platform of platforms) {
    preview[platform] = mapper(sourceData, platform);
  }
  return { success: true, preview };
}
