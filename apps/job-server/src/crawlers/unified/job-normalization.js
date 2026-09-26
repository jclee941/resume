/**
 * @typedef {object} ConvertParamsInput
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {number | string} [experience]
 * @property {string} [location]
 * @property {Array<string | number>} [categories]
 */

/**
 * @typedef {object} ConvertedParams
 * @property {number} limit
 * @property {number} offset
 * @property {number | string} [years]
 * @property {number | string} [experience]
 * @property {string} [locations]
 * @property {string} [location]
 * @property {Array<string | number>} [tag_type_ids]
 */

/**
 * @typedef {object} DeduplicableJob
 * @property {string} [company]
 * @property {string} [position]
 * @property {string} [source]
 */

/**
 * @param {string} source
 * @param {ConvertParamsInput} params
 * @returns {ConvertedParams}
 */
export function convertParams(source, params) {
  /** @type {ConvertedParams} */
  const converted = {
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  if (params.experience !== undefined) {
    converted.years = params.experience;
    converted.experience = params.experience;
  }

  if (params.location) {
    converted.locations = params.location;
    converted.location = params.location;
  }

  if (source === 'wanted' && params.categories && params.categories.length > 0) {
    converted.tag_type_ids = params.categories;
  }

  return converted;
}

/**
 * @template {DeduplicableJob} T
 * @param {T[]} jobs
 * @returns {T[]}
 */
export function deduplicateJobs(jobs) {
  /** @type {Map<string, T>} */
  const seen = new Map();

  return jobs.filter((job) => {
    const key = `${job.company?.toLowerCase()?.trim()}_${job.position?.toLowerCase()?.trim()}`;

    if (seen.has(key)) {
      const existing = /** @type {T} */ (seen.get(key));
      if (job.source === 'wanted' && existing.source !== 'wanted') {
        seen.set(key, job);
        return true;
      }
      return false;
    }

    seen.set(key, job);
    return true;
  });
}
