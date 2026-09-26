import { normalizeForeignAtsSearchCriteria } from '../ats/foreign-ats-registry.js';

/**
 * @typedef {Record<string, unknown> & {
 *   locations?: string | readonly string[];
 *   locationTargets?: string | readonly string[];
 * }} SearchApplySourceOptions
 *
 * Job record a crawler or foreign ATS adapter returns for the apply pipeline.
 * @typedef {{
 *   company?: string | null;
 *   title?: string;
 *   source?: string;
 *   sourceUrl?: string;
 *   dryRunOnly?: boolean;
 *   submissionSkipped?: boolean;
 *   [key: string]: unknown;
 * }} ApplySourceJob
 *
 * @typedef {{
 *   crawler: { search: (platform: string, keywords: unknown, options?: Record<string, unknown>) => Promise<ApplySourceJob[]> };
 *   foreignAtsRegistry?: {
 *     supports: (platform: unknown) => boolean;
 *     getAdapter: (platform: unknown) => { search: (criteria: Record<string, unknown>) => Promise<ApplySourceJob[]> };
 *   } | null;
 *   platform: string;
 *   keywords: readonly string[];
 *   options?: SearchApplySourceOptions | null;
 *   locationTargets?: string | readonly string[];
 * }} SearchApplySourceParams
 */

/**
 * @param {SearchApplySourceParams} params
 * @returns {Promise<ApplySourceJob[]>}
 */
export async function searchApplySource({
  crawler,
  foreignAtsRegistry,
  platform,
  keywords,
  options = {},
  locationTargets,
}) {
  const safeOptions = isRecord(options) ? options : {};

  if (foreignAtsRegistry?.supports(platform)) {
    const adapter = foreignAtsRegistry.getAdapter(platform);
    const locations = safeOptions.locations ?? safeOptions.locationTargets ?? locationTargets;
    const criteria = normalizeForeignAtsSearchCriteria({ keywords, locations });

    return adapter.search({
      ...safeOptions,
      ...criteria,
    });
  }

  return crawler.search(platform, keywords, safeOptions);
}

/**
 * @param {unknown} value
 * @returns {value is SearchApplySourceOptions}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
