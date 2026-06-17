export const FOREIGN_ATS_LOCATION_TARGETS = Object.freeze([
  'remote',
  'seoul',
  'incheon',
  'gyeonggi',
]);

const LOCATION_MATCHERS = Object.freeze([
  ['remote', /remote|anywhere|work from home|재택|원격/i],
  ['seoul', /seoul|서울/i],
  ['incheon', /incheon|인천/i],
  ['gyeonggi', /gyeonggi|경기|경기도|pangyo|판교|bundang|분당|seongnam|성남/i],
]);

export function normalizeForeignAtsSearchCriteria(criteria = {}) {
  const locationInput = Array.isArray(criteria.locations)
    ? criteria.locations
    : criteria.locations
      ? [criteria.locations]
      : FOREIGN_ATS_LOCATION_TARGETS;
  const normalized = [];
  const unsupported = [];

  for (const location of locationInput) {
    const targets = normalizePostingLocations(location);

    if (targets.length === 0 && String(location).trim()) {
      unsupported.push(String(location));
    }

    for (const target of targets) {
      if (!normalized.includes(target)) normalized.push(target);
    }
  }

  return {
    keywords: Array.isArray(criteria.keywords) ? [...criteria.keywords] : [],
    dryRun: true,
    locationTargets: normalized,
    unsupportedLocations: unsupported,
  };
}

export function normalizePostingLocations(source) {
  const values = collectLocationValues(source);
  const normalized = [];

  for (const value of values) {
    const text = String(value).trim();

    for (const [target, matcher] of LOCATION_MATCHERS) {
      if (matcher.test(text) && !normalized.includes(target)) {
        normalized.push(target);
      }
    }
  }

  return normalized;
}

function collectLocationValues(source) {
  if (source === null || source === undefined) return [];
  if (typeof source === 'string' || typeof source === 'number') return [source];
  if (typeof source === 'boolean') return [];
  if (Array.isArray(source)) return source.flatMap((item) => collectLocationValues(item));
  if (typeof source !== 'object') return [];

  const values = [];

  if (source.remote === true) values.push('remote');

  for (const key of [
    'name',
    'location',
    'locationName',
    'city',
    'region',
    'country',
    'workplaceType',
    'office',
    'offices',
    'categories',
  ]) {
    if (Object.hasOwn(source, key)) {
      values.push(...collectLocationValues(source[key]));
    }
  }

  return values;
}
