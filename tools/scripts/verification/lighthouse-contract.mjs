export {
  assertLhrIdentity,
  assertReportInventory,
  expectedReportFiles,
  installSignalHandlers,
  prepareOutputDir,
  profileAuditSettings,
  validateAuditUrls,
  withTimeout,
  writeReportPair,
} from './lighthouse-runtime.mjs';

export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeAssertion(raw) {
  return Array.isArray(raw)
    ? { level: String(raw[0] ?? 'warn').toLowerCase(), options: raw[1] ?? {} }
    : { level: String(raw ?? 'warn').toLowerCase(), options: {} };
}

function assertionValue(lhr, key, options) {
  if (key.startsWith('categories:')) {
    const value = lhr.categories?.[key.split(':')[1]]?.score;
    return typeof value === 'number' ? value : null;
  }
  if (key.startsWith('resource-summary:')) {
    const [, resourceType, metric] = key.split(':');
    const items = lhr.audits?.['resource-summary']?.details?.items;
    if (metric !== 'size' || !Array.isArray(items)) return null;
    const value = items.find((item) => item.resourceType === resourceType)?.transferSize;
    return typeof value === 'number' ? value : null;
  }
  const audit = lhr.audits?.[key];
  const numeric = options.maxNumericValue !== undefined || options.minNumericValue !== undefined;
  const value = numeric ? audit?.numericValue : audit?.score;
  return typeof value === 'number' ? value : null;
}

function evaluateValue(key, assertion, value, context) {
  const messages = [];
  if (value === null) messages.push(`${context} ${key}: metric unavailable`);
  const { minScore, minNumericValue, maxNumericValue } = assertion.options;
  if (value !== null && typeof minScore === 'number' && value < minScore) {
    messages.push(`${context} ${key}: ${value.toFixed(3)} < minScore ${minScore}`);
  }
  if (value !== null && typeof minNumericValue === 'number' && value < minNumericValue) {
    messages.push(`${context} ${key}: ${value.toFixed(2)} < minNumericValue ${minNumericValue}`);
  }
  if (value !== null && typeof maxNumericValue === 'number' && value > maxNumericValue) {
    messages.push(`${context} ${key}: ${value.toFixed(2)} > maxNumericValue ${maxNumericValue}`);
  }
  const defaultScore =
    minScore === undefined && minNumericValue === undefined && maxNumericValue === undefined;
  if (value !== null && defaultScore && value < 1) {
    messages.push(`${context} ${key}: score ${value.toFixed(3)} < 1`);
  }
  return messages;
}

export function summarizeProfile(profileName, lhrs, rawAssertions) {
  const medians = {};
  const medianFailures = [];
  const missingMetricFailures = [];
  const runOutliers = [];
  const warnings = [];
  const runMetrics = lhrs.map((lhr, index) => ({
    run: index + 1,
    userAgent: lhr.userAgent ?? null,
    metrics: {},
  }));
  for (const [key, raw] of Object.entries(rawAssertions)) {
    const assertion = normalizeAssertion(raw);
    if (!['error', 'warn'].includes(assertion.level)) continue;
    const values = lhrs.map((lhr) => assertionValue(lhr, key, assertion.options));
    medians[key] = median(values.filter((value) => value !== null));
    const medianMessages = evaluateValue(key, assertion, medians[key], `[${profileName} median]`);
    (assertion.level === 'error' ? medianFailures : warnings).push(...medianMessages);
    values.forEach((value, index) => {
      runMetrics[index].metrics[key] = value;
      const messages = evaluateValue(key, assertion, value, `[${profileName} run ${index + 1}]`);
      if (value === null && assertion.level === 'error') missingMetricFailures.push(...messages);
      for (const message of messages) {
        runOutliers.push({ run: index + 1, key, value, level: assertion.level, message });
      }
    });
  }
  return {
    profileName,
    runs: lhrs.length,
    medians,
    failures: [...medianFailures, ...missingMetricFailures],
    medianFailures,
    missingMetricFailures,
    runMetrics,
    runOutliers,
    warnings,
    userAgents: lhrs.map((lhr) => lhr.userAgent ?? null),
    auditIdentities: lhrs.map((lhr) => ({
      formFactor: lhr.configSettings?.formFactor ?? null,
      mobile: lhr.configSettings?.screenEmulation?.mobile ?? null,
      emulatedUserAgent: lhr.configSettings?.emulatedUserAgent ?? null,
    })),
  };
}
