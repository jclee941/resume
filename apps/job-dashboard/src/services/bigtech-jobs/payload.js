/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {Record<string, unknown>} */
export function object(value) {
  if (!isObject(value)) throw new Error('Invalid career data object');
  return value;
}

/** @param {string} body @returns {Record<string, unknown>} */
export function parseObject(body) {
  /** @type {unknown} */
  const value = JSON.parse(body);
  return object(value);
}

/** @param {unknown} value @param {string} source @returns {unknown[]} */
export function rows(value, source) {
  if (!Array.isArray(value)) throw new Error(`${source}: invalid posting list`);
  return value;
}

/** @param {unknown} value @returns {string} */
export function text(value) {
  if (typeof value !== 'string') throw new Error('Invalid career text field');
  return value;
}

/** @param {unknown} value @returns {string | null} */
export function optionalText(value) {
  return value == null ? null : text(value);
}

/** @param {unknown} value @returns {string} */
export function identifier(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Invalid career posting identifier');
  }
  return String(value);
}

/** @param {unknown} value @returns {number} */
export function count(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('Invalid career pagination count');
  }
  return value;
}

/** @param {string} html @returns {Record<string, unknown>} */
export function schemaJob(html) {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    /** @type {unknown} */
    const value = JSON.parse(match[1]);
    const entries = Array.isArray(value)
      ? rows(value, 'JSON-LD')
      : object(value)['@graph'] || [value];
    for (const entry of rows(entries, 'JSON-LD')) {
      const job = object(entry);
      if (job['@type'] === 'JobPosting') return job;
    }
  }
  throw new Error('Missing JobPosting structured data');
}
