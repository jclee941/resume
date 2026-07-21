export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

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

function getResourceSummaryValue(lhr, key) {
  const [, type, metric] = key.split(':');
  if (metric !== 'size') return null;

  const items = lhr.audits?.['resource-summary']?.details?.items;
  if (!Array.isArray(items)) return null;

  const target = items.find((item) => item.resourceType === type);
  return typeof target?.transferSize === 'number' ? target.transferSize : null;
}

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

export function evaluateAssertion(key, assertion, value, profileName) {
  const failures = [];
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

export function summarizeAssertions(profileName, results, assertions) {
  const failures = [];
  const warnings = [];

  for (const [key, rawAssertion] of Object.entries(assertions)) {
    const assertion = normalizeAssertion(rawAssertion);
    if (assertion.level !== 'error' && assertion.level !== 'warn') continue;

    const values = results
      .map((lhr) => getAssertionValue(lhr, key, assertion.options))
      .filter((value) => value !== null);
    const outcome = evaluateAssertion(key, assertion, median(values), profileName);
    failures.push(...outcome.failures);
    warnings.push(...outcome.warnings);
  }

  return { failures, warnings };
}

export function getCategoryScores(lhr) {
  return {
    performance: lhr.categories?.performance?.score ?? null,
    accessibility: lhr.categories?.accessibility?.score ?? null,
    bestPractices: lhr.categories?.['best-practices']?.score ?? null,
    seo: lhr.categories?.seo?.score ?? null,
  };
}
