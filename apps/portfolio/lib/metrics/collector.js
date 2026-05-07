const { initHistogramBuckets, observeHistogram } = require('./histogram');

/**
 * @typedef {Object} WorkerMetrics
 * @property {number} requests_total - Total number of requests.
 * @property {number} requests_success - Successful requests (2xx/3xx).
 * @property {number} requests_error - Failed requests (4xx/5xx).
 * @property {number} response_time_sum - Sum of response times in ms.
 * @property {number} vitals_received - Web Vitals data points received.
 * @property {number} worker_start_time - Worker start timestamp.
 * @property {Object} [path_counts] - Request counts by path.
 * @property {Object} [status_counts] - Request counts by status code.
 * @property {Object} [response_time_buckets] - Response time histogram buckets.
 * @property {Object} [web_vitals] - Aggregated Web Vitals metrics.
 * @property {Object} [cf_metrics] - Cloudflare-specific metrics.
 * @property {Object} [geo_metrics] - Geographic distribution metrics.
 */

/**
 * Create a new metrics collector instance.
 * @returns {WorkerMetrics}
 */
function createMetricsCollector() {
  return {
    requests_total: 0,
    requests_success: 0,
    requests_error: 0,
    response_time_sum: 0,
    vitals_received: 0,
    worker_start_time: Date.now(),
    response_time_buckets: initHistogramBuckets(),
    web_vitals: {
      lcp: 0,
      inp: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      samples: 0,
    },
    cf_metrics: {
      cache_hit_ratio: 0,
      cache_bypass_ratio: 0,
      cpu_time_ms: 0,
      cache_hits: 0,
      cache_misses: 0,
    },
    geo_metrics: {
      by_country: {},
      by_colo: {},
    },
    version: 'unknown',
    deployed_at: 'unknown',
  };
}

/**
 * Record a request in the metrics collector.
 * @param {WorkerMetrics} collector - Metrics collector instance.
 * @param {Object} options - Request options.
 * @param {number} options.responseTimeMs - Response time in milliseconds.
 * @param {number} options.status - HTTP status code.
 * @param {string} [options.country] - Country code from CF headers.
 * @param {string} [options.colo] - Cloudflare colo code.
 * @param {boolean} [options.cacheHit] - Whether request was served from cache.
 * @param {number} [options.cpuTimeMs] - CPU time used for this request.
 */
function recordRequest(collector, options) {
  const { responseTimeMs, status, country, colo, cacheHit, cpuTimeMs } = options;

  collector.requests_total++;
  if (status >= 200 && status < 400) {
    collector.requests_success++;
  } else {
    collector.requests_error++;
  }

  collector.response_time_sum += responseTimeMs;
  observeHistogram(collector.response_time_buckets, responseTimeMs / 1000);

  if (country) {
    collector.geo_metrics.by_country[country] =
      (collector.geo_metrics.by_country[country] || 0) + 1;
  }
  if (colo) {
    collector.geo_metrics.by_colo[colo] = (collector.geo_metrics.by_colo[colo] || 0) + 1;
  }

  if (cacheHit !== undefined) {
    if (cacheHit) {
      collector.cf_metrics.cache_hits++;
    } else {
      collector.cf_metrics.cache_misses++;
    }
    const total = collector.cf_metrics.cache_hits + collector.cf_metrics.cache_misses;
    collector.cf_metrics.cache_hit_ratio = total > 0 ? collector.cf_metrics.cache_hits / total : 0;
    collector.cf_metrics.cache_bypass_ratio = 1 - collector.cf_metrics.cache_hit_ratio;
  }

  if (cpuTimeMs !== undefined) {
    const prevAvg = collector.cf_metrics.cpu_time_ms;
    const n = collector.requests_total;
    collector.cf_metrics.cpu_time_ms = prevAvg + (cpuTimeMs - prevAvg) / n;
  }
}

module.exports = {
  createMetricsCollector,
  recordRequest,
};
