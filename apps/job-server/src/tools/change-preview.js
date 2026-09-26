/**
 * @template TSource, TTarget
 * @param {TSource} sourceData
 * @param {string[]} platforms
 * @param {(source: TSource, platform: string) => TTarget} mapper
 * @returns {{ success: true, preview: Record<string, TTarget> }}
 */
export function previewChanges(sourceData, platforms, mapper) {
  /** @type {Record<string, TTarget>} */
  const preview = {};
  for (const platform of platforms) {
    preview[platform] = mapper(sourceData, platform);
  }
  return { success: true, preview };
}
