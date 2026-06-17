import { normalizeForeignAtsSearchCriteria } from '../ats/foreign-ats-registry.js';

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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
