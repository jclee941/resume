/**
 * @typedef {{
 *   minScore?: number;
 *   maxNumericValue?: number;
 *   minNumericValue?: number;
 *   [key: string]: unknown;
 * }} AssertionOptions
 *
 * @typedef {{
 *   level: string;
 *   options: AssertionOptions;
 * }} NormalizedAssertion
 *
 * @typedef {{
 *   score?: number | null;
 *   numericValue?: number | null;
 *   details?: {
 *     items?: Array<{
 *       resourceType?: string;
 *       transferSize?: number;
 *       [key: string]: unknown;
 *     }>;
 *     [key: string]: unknown;
 *   };
 *   [key: string]: unknown;
 * }} LighthouseAudit
 *
 * @typedef {{
 *   score?: number | null;
 *   [key: string]: unknown;
 * }} LighthouseCategory
 *
 * @typedef {{
 *   categories?: Record<string, LighthouseCategory | undefined>;
 *   audits?: Record<string, LighthouseAudit | undefined>;
 *   [key: string]: unknown;
 * }} LighthouseResult
 *
 * @typedef {{
 *   performance: number | null;
 *   accessibility: number | null;
 *   bestPractices: number | null;
 *   seo: number | null;
 * }} CategoryScores
 */

/**
 * @param {number[]} values
 * @returns {number | null}
 */
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * @param {unknown} rawAssertion
 * @returns {NormalizedAssertion}
 */
export function normalizeAssertion(rawAssertion) {
  if (Array.isArray(rawAssertion)) {
    return {
      level: String(rawAssertion[0] ?? 'warn').toLowerCase(),
      options: rawAssertion[1] ?? {},
    };
  }
  return {
    level: String(rawAssertion ?? 'warn').toLowerCase(),
    options: {},
  };
}

/**
 * @param {LighthouseResult} lhr
 * @param {string} key
 * @returns {number | null}
 */
function getResourceSummaryValue(lhr, key) {
  const [, type, metric] = key.split(':');
  if (metric !== 'size') return null;

  const items = lhr.audits?.['resource-summary']?.details?.items;
  if (!Array.isArray(items)) return null;

  const target = items.find((item) => item.resourceType === type);
  return typeof target?.transferSize === 'number' ? target.transferSize : null;
}

/**
 * @param {LighthouseResult} lhr
 * @param {string} key
 * @param {AssertionOptions} options
 * @returns {number | null}
 */
export function getAssertionValue(lhr, key, options) {
  if (key.startsWith('categories:')) {
    const category = key.split(':')[1];
    const score = lhr.categories?.[category]?.score;
    return typeof score === 'number' ? score : null;
  }

  if (key.startsWith('resource-summary:')) {
    return getResourceSummaryValue(lhr, key);
  }

  const audit = lhr.audits?.[key];
  if (!audit) return null;

  if (typeof options.maxNumericValue === 'number' || typeof options.minNumericValue === 'number') {
    return typeof audit.numericValue === 'number' ? audit.numericValue : null;
  }

  return typeof audit.score === 'number' ? audit.score : null;
}

/**
 * @param {string} key
 * @param {NormalizedAssertion} assertion
 * @param {number | null} value
 * @param {string} profileName
 * @returns {{ failures: string[]; warnings: string[] }}
 */
function evaluateAssertion(key, assertion, value, profileName) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const warnings = [];

  if (value === null) {
    warnings.push(`[${profileName}] ${key}: metric not available in current Lighthouse version`);
    return { failures, warnings };
  }

  const opts = assertion.options;
  if (typeof opts.minScore === 'number' && value < opts.minScore) {
    failures.push(`[${profileName}] ${key}: ${value.toFixed(3)} < minScore ${opts.minScore}`);
  }

  if (typeof opts.maxNumericValue === 'number' && value > opts.maxNumericValue) {
    failures.push(
      `[${profileName}] ${key}: ${value.toFixed(2)} > maxNumericValue ${opts.maxNumericValue}`
    );
  }

  if (opts.minScore === undefined && opts.maxNumericValue === undefined) {
    if (assertion.level === 'error' && value < 1) {
      failures.push(`[${profileName}] ${key}: score ${value.toFixed(3)} < 1`);
    }
    if (assertion.level === 'warn' && value < 1) {
      warnings.push(`[${profileName}] ${key}: score ${value.toFixed(3)} < 1`);
    }
  }

  return { failures, warnings };
}

/**
 * @param {string} profileName
 * @param {LighthouseResult[]} results
 * @param {Record<string, unknown>} assertions
 * @returns {{ failures: string[]; warnings: string[] }}
 */
export function summarizeAssertions(profileName, results, assertions) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const warnings = [];

  for (const [key, rawAssertion] of Object.entries(assertions)) {
    const assertion = normalizeAssertion(rawAssertion);
    if (assertion.level !== 'error' && assertion.level !== 'warn') continue;

    const values = results
      .map((lhr) => getAssertionValue(lhr, key, assertion.options))
      .filter(/** @type {(v: number | null) => v is number} */ ((value) => value !== null));
    const outcome = evaluateAssertion(key, assertion, median(values), profileName);
    failures.push(...outcome.failures);
    warnings.push(...outcome.warnings);
  }

  return { failures, warnings };
}

/**
 * @param {LighthouseResult} lhr
 * @returns {CategoryScores}
 */
export function getCategoryScores(lhr) {
  return {
    performance: lhr.categories?.performance?.score ?? null,
    accessibility: lhr.categories?.accessibility?.score ?? null,
    bestPractices: lhr.categories?.['best-practices']?.score ?? null,
    seo: lhr.categories?.seo?.score ?? null,
  };
}
