/**
 * Histogram bucket boundaries in seconds (Prometheus standard).
 * @type {number[]}
 */
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Initialize empty histogram buckets.
 * @returns {Object}
 */
function initHistogramBuckets() {
  const buckets = {};
  HISTOGRAM_BUCKETS.forEach((le) => {
    buckets[le] = 0;
  });
  buckets['+Inf'] = 0;
  return buckets;
}

/**
 * Update histogram buckets with a new observation.
 * @param {Object} buckets - Current bucket counts.
 * @param {number} valueSeconds - Observed value in seconds.
 */
function observeHistogram(buckets, valueSeconds) {
  HISTOGRAM_BUCKETS.forEach((le) => {
    if (valueSeconds <= le) {
      buckets[le]++;
    }
  });
  buckets['+Inf']++;
}

/**
 * Generate histogram metric lines.
 * @param {string} name - Metric name.
 * @param {Object} buckets - Bucket counts.
 * @param {string} labels - Additional labels.
 * @returns {string}
 */
function generateHistogramLines(name, buckets, labels = '') {
  const labelPrefix = labels ? `${labels},` : '';
  let lines = '';

  HISTOGRAM_BUCKETS.forEach((le) => {
    lines += `${name}_bucket{${labelPrefix}le="${le}"} ${buckets[le] || 0}\n`;
  });
  lines += `${name}_bucket{${labelPrefix}le="+Inf"} ${buckets['+Inf'] || 0}\n`;

  return lines;
}

module.exports = {
  HISTOGRAM_BUCKETS,
  initHistogramBuckets,
  observeHistogram,
  generateHistogramLines,
};
