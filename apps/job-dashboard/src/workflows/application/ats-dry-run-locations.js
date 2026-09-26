/** @type {ReadonlyArray<readonly [string, RegExp]>} */
const ATS_LOCATION_MATCHERS = Object.freeze([
  ['remote', /remote|anywhere|work from home|재택|원격/i],
  ['seoul', /seoul|서울/i],
  ['incheon', /incheon|인천/i],
  ['gyeonggi', /gyeonggi|경기|경기도|pangyo|판교|bundang|분당|seongnam|성남/i],
]);

const LOCATION_KEYS = Object.freeze([
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
]);

/**
 * @param {unknown} source
 * @returns {string[]}
 */
export function normalizePostingLocations(source) {
  /** @type {string[]} */
  const normalized = [];

  for (const value of collectLocationValues(source)) {
    const text = String(value).trim();

    for (const [target, matcher] of ATS_LOCATION_MATCHERS) {
      if (matcher.test(text) && !normalized.includes(target)) normalized.push(target);
    }
  }

  return normalized;
}

/**
 * @param {unknown} source
 * @returns {Array<string | number>}
 */
function collectLocationValues(source) {
  if (source === null || source === undefined) return [];
  if (typeof source === 'string' || typeof source === 'number') return [source];
  if (typeof source === 'boolean') return [];
  if (Array.isArray(source)) return source.flatMap((item) => collectLocationValues(item));
  if (typeof source !== 'object') return [];

  const values = [];
  const obj = /** @type {Record<string, unknown>} */ (source);
  if (obj.remote === true) values.push('remote');

  for (const key of LOCATION_KEYS) {
    if (Object.hasOwn(obj, key)) values.push(...collectLocationValues(obj[key]));
  }

  return values;
}
