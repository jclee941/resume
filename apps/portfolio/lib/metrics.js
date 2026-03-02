/**
 * @typedef {Object} WorkerMetrics
 * @property {number} requests_total - Total number of requests
 * @property {number} requests_success - Successful requests (2xx)
 * @property {number} requests_error - Failed requests (4xx, 5xx)
 * @property {number} response_time_sum - Sum of response times in ms
 * @property {number} vitals_received - Web Vitals data points received
 * @property {number} worker_start_time - Worker start timestamp
 * @property {Object} [path_counts] - Request counts by path
 * @property {Object} [status_counts] - Request counts by status code
 * @property {Object} [response_time_buckets] - Response time histogram buckets
 * @property {Object} [web_vitals] - Aggregated Web Vitals metrics
 * @property {Object} [cf_metrics] - Cloudflare-specific metrics
 * @property {Object} [geo_metrics] - Geographic distribution metrics
 */

/**
 * Histogram bucket boundaries in seconds (Prometheus standard)
 * @type {number[]}
 */
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Initialize empty histogram buckets
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
 * Update histogram buckets with a new observation
 * @param {Object} buckets - Current bucket counts
 * @param {number} valueSeconds - Observed value in seconds
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
 * Generate histogram metric lines
 * @param {string} name - Metric name
 * @param {Object} buckets - Bucket counts
 * @param {string} labels - Additional labels
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

/**
 * Generate Prometheus metrics in exposition format
 * Enhanced with Cloudflare metrics, Web Vitals, histograms, and geographic labels
 * @param {WorkerMetrics} metrics
 * @param {Object} [requestInfo] - Current request info for labels
 * @returns {string}
 */
function generateMetrics(metrics, _requestInfo = {}) {
  const avgResponseTime =
    metrics.requests_total > 0
      ? (metrics.response_time_sum / metrics.requests_total).toFixed(2)
      : 0;

  const uptimeSeconds = Math.floor((Date.now() - metrics.worker_start_time) / 1000);
  const errorRate =
    metrics.requests_total > 0
      ? ((metrics.requests_error / metrics.requests_total) * 100).toFixed(2)
      : 0;
  const successRate =
    metrics.requests_total > 0
      ? ((metrics.requests_success / metrics.requests_total) * 100).toFixed(2)
      : 100;

  // Extract Cloudflare metrics with defaults
  const cfMetrics = metrics.cf_metrics || {};
  const cacheHitRatio = cfMetrics.cache_hit_ratio ?? 0.85;
  const cacheBypassRatio = cfMetrics.cache_bypass_ratio ?? 0.15;
  const cpuTimeMs = cfMetrics.cpu_time_ms ?? 5;

  // Extract Web Vitals with defaults (in ms)
  const webVitals = metrics.web_vitals || {};
  const lcpMs = webVitals.lcp ?? 0;
  const inpMs = webVitals.inp ?? 0;
  const clsScore = webVitals.cls ?? 0;
  const fcpMs = webVitals.fcp ?? 0;
  const ttfbMs = webVitals.ttfb ?? 0;

  // Generate histogram for response times
  const histogramBuckets = metrics.response_time_buckets || initHistogramBuckets();
  const histogramLines = generateHistogramLines(
    'http_request_duration_seconds',
    histogramBuckets,
    'job="resume"'
  );

  // Calculate histogram sum and count
  const histogramSum = (metrics.response_time_sum || 0) / 1000; // Convert ms to seconds
  const histogramCount = metrics.requests_total || 0;

  // Geographic metrics (country/colo distribution)
  let geoMetricsLines = '';
  if (metrics.geo_metrics) {
    const { by_country = {}, by_colo = {} } = metrics.geo_metrics;

    // Requests by country
    Object.entries(by_country).forEach(([country, count]) => {
      geoMetricsLines += `http_requests_by_country{job="resume",country="${country}"} ${count}\n`;
    });

    // Requests by Cloudflare colo
    Object.entries(by_colo).forEach(([colo, count]) => {
      geoMetricsLines += `http_requests_by_colo{job="resume",colo="${colo}"} ${count}\n`;
    });
  }

  return `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{job="resume"} ${metrics.requests_total}

# HELP http_requests_success Successful HTTP requests
# TYPE http_requests_success counter
http_requests_success{job="resume"} ${metrics.requests_success}

# HELP http_requests_error Failed HTTP requests
# TYPE http_requests_error counter
http_requests_error{job="resume"} ${metrics.requests_error}

# HELP http_response_time_seconds Average response time in seconds
# TYPE http_response_time_seconds gauge
http_response_time_seconds{job="resume"} ${(avgResponseTime / 1000).toFixed(4)}

# HELP http_response_time_ms Average response time in milliseconds
# TYPE http_response_time_ms gauge
http_response_time_ms{job="resume"} ${avgResponseTime}

# HELP http_request_duration_seconds Request duration histogram
# TYPE http_request_duration_seconds histogram
${histogramLines}http_request_duration_seconds_sum{job="resume"} ${histogramSum.toFixed(4)}
http_request_duration_seconds_count{job="resume"} ${histogramCount}

# HELP web_vitals_received Web Vitals data points received
# TYPE web_vitals_received counter
web_vitals_received{job="resume"} ${metrics.vitals_received}

# HELP web_vitals_lcp_ms Largest Contentful Paint in milliseconds
# TYPE web_vitals_lcp_ms gauge
web_vitals_lcp_ms{job="resume"} ${lcpMs}

# HELP web_vitals_inp_ms Interaction to Next Paint in milliseconds (replaces FID)
# TYPE web_vitals_inp_ms gauge
web_vitals_inp_ms{job="resume"} ${inpMs}

# HELP web_vitals_cls Cumulative Layout Shift score
# TYPE web_vitals_cls gauge
web_vitals_cls{job="resume"} ${clsScore}

# HELP web_vitals_fcp_ms First Contentful Paint in milliseconds
# TYPE web_vitals_fcp_ms gauge
web_vitals_fcp_ms{job="resume"} ${fcpMs}

# HELP web_vitals_ttfb_ms Time to First Byte in milliseconds
# TYPE web_vitals_ttfb_ms gauge
web_vitals_ttfb_ms{job="resume"} ${ttfbMs}

# HELP cloudflare_cache_hit_ratio Cloudflare cache hit ratio (0-1)
# TYPE cloudflare_cache_hit_ratio gauge
cloudflare_cache_hit_ratio{job="resume"} ${cacheHitRatio}

# HELP cloudflare_cache_bypass_ratio Cloudflare cache bypass ratio (0-1)
# TYPE cloudflare_cache_bypass_ratio gauge
cloudflare_cache_bypass_ratio{job="resume"} ${cacheBypassRatio}

# HELP cloudflare_worker_cpu_time_ms Worker CPU time in milliseconds
# TYPE cloudflare_worker_cpu_time_ms gauge
cloudflare_worker_cpu_time_ms{job="resume"} ${cpuTimeMs}

# HELP worker_uptime_seconds Worker uptime in seconds
# TYPE worker_uptime_seconds gauge
worker_uptime_seconds{job="resume"} ${uptimeSeconds}

# HELP http_error_rate_percent Error rate percentage
# TYPE http_error_rate_percent gauge
http_error_rate_percent{job="resume"} ${errorRate}

# HELP http_success_rate_percent Success rate percentage
# TYPE http_success_rate_percent gauge
http_success_rate_percent{job="resume"} ${successRate}

# HELP worker_info Worker information with version and deployment metadata
# TYPE worker_info gauge
worker_info{job="resume",version="${metrics.version || 'unknown'}",deployed_at="${metrics.deployed_at || 'unknown'}"} 1

# HELP http_requests_by_country HTTP requests by country
# TYPE http_requests_by_country counter
${geoMetricsLines || '# No geographic data collected yet\n'}`;
}

/**
 * Create a new metrics collector instance
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
 * Record a request in the metrics collector
 * @param {WorkerMetrics} collector - Metrics collector instance
 * @param {Object} options - Request options
 * @param {number} options.responseTimeMs - Response time in milliseconds
 * @param {number} options.status - HTTP status code
 * @param {string} [options.country] - Country code from CF headers
 * @param {string} [options.colo] - Cloudflare colo code
 * @param {boolean} [options.cacheHit] - Whether request was served from cache
 * @param {number} [options.cpuTimeMs] - CPU time used for this request
 */
function recordRequest(collector, options) {
  const { responseTimeMs, status, country, colo, cacheHit, cpuTimeMs } = options;

  // Update request counts
  collector.requests_total++;
  if (status >= 200 && status < 400) {
    collector.requests_success++;
  } else {
    collector.requests_error++;
  }

  // Update response time
  collector.response_time_sum += responseTimeMs;
  observeHistogram(collector.response_time_buckets, responseTimeMs / 1000);

  // Update geographic metrics
  if (country) {
    collector.geo_metrics.by_country[country] =
      (collector.geo_metrics.by_country[country] || 0) + 1;
  }
  if (colo) {
    collector.geo_metrics.by_colo[colo] = (collector.geo_metrics.by_colo[colo] || 0) + 1;
  }

  // Update cache metrics
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

  // Update CPU time (running average)
  if (cpuTimeMs !== undefined) {
    const prevAvg = collector.cf_metrics.cpu_time_ms;
    const n = collector.requests_total;
    collector.cf_metrics.cpu_time_ms = prevAvg + (cpuTimeMs - prevAvg) / n;
  }
}

/**
 * Record Web Vitals data
 * @param {WorkerMetrics} collector - Metrics collector instance
 * @param {Object} vitals - Web Vitals data
 * @param {number} [vitals.lcp] - Largest Contentful Paint (ms)
 * @param {number} [vitals.inp] - Interaction to Next Paint (ms)
 * @param {number} [vitals.cls] - Cumulative Layout Shift
 * @param {number} [vitals.fcp] - First Contentful Paint (ms)
 * @param {number} [vitals.ttfb] - Time to First Byte (ms)
 */
function recordWebVitals(collector, vitals) {
  collector.vitals_received++;
  const wv = collector.web_vitals;
  const n = wv.samples + 1;

  // Running average for each vital
  if (vitals.lcp !== undefined) {
    wv.lcp = wv.lcp + (vitals.lcp - wv.lcp) / n;
  }
  if (vitals.inp !== undefined) {
    wv.inp = wv.inp + (vitals.inp - wv.inp) / n;
  }
  if (vitals.cls !== undefined) {
    wv.cls = wv.cls + (vitals.cls - wv.cls) / n;
  }
  if (vitals.fcp !== undefined) {
    wv.fcp = wv.fcp + (vitals.fcp - wv.fcp) / n;
  }
  if (vitals.ttfb !== undefined) {
    wv.ttfb = wv.ttfb + (vitals.ttfb - wv.ttfb) / n;
  }

  wv.samples = n;
}

module.exports = {
  generateMetrics,
  createMetricsCollector,
  recordRequest,
  recordWebVitals,
  initHistogramBuckets,
  observeHistogram,
  generateHistogramLines,
  HISTOGRAM_BUCKETS,
};
