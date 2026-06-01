const { generateHistogramLines, initHistogramBuckets } = require('./histogram');

/**
 * Generate Prometheus metrics in exposition format.
 * Enhanced with Cloudflare metrics, Web Vitals, histograms, and geographic labels.
 * @param {import('./collector').WorkerMetrics} metrics
 * @param {Object} [requestInfo] - Current request info for labels.
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

  // P2-18 fix: cf_metrics fields default to NaN (not arbitrary fake values)
  // when not populated, so dashboards/Grafana correctly show 'no data' rather
  // than a fabricated stable cache hit ratio. Prometheus exposition prints
  // NaN as 'NaN' which scrapers treat as missing.
  const cfMetrics = metrics.cf_metrics || {};
  const cacheHitRatio = cfMetrics.cache_hit_ratio ?? NaN;
  const cacheBypassRatio = cfMetrics.cache_bypass_ratio ?? NaN;
  const cpuTimeMs = cfMetrics.cpu_time_ms ?? NaN;

  const webVitals = metrics.web_vitals || {};
  const lcpMs = webVitals.lcp ?? 0;
  const inpMs = webVitals.inp ?? 0;
  const clsScore = webVitals.cls ?? 0;
  const fcpMs = webVitals.fcp ?? 0;
  const ttfbMs = webVitals.ttfb ?? 0;

  const histogramBuckets = metrics.response_time_buckets || initHistogramBuckets();
  const histogramLines = generateHistogramLines(
    'http_request_duration_seconds',
    histogramBuckets,
    'job="resume"'
  );
  const histogramSum = (metrics.response_time_sum || 0) / 1000;
  const histogramCount = metrics.requests_total || 0;
  let geoMetricsLines = '';
  if (metrics.geo_metrics) {
    const { by_country = {}, by_colo = {} } = metrics.geo_metrics;

    Object.entries(by_country).forEach(([country, count]) => {
      geoMetricsLines += `http_requests_by_country{job="resume",country="${country}"} ${count}\n`;
    });

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

# HELP es_log_failures_total Cumulative count of Elasticsearch log writes that failed (P2-19)
# TYPE es_log_failures_total counter
es_log_failures_total{job="resume"} ${typeof globalThis.__esLogFailures === 'number' ? globalThis.__esLogFailures : 0}

# HELP es_log_total Cumulative count of successful Elasticsearch log writes
# TYPE es_log_total counter
es_log_total{job="resume"} ${typeof globalThis.__esLogTotal === 'number' ? globalThis.__esLogTotal : 0}

# HELP http_requests_by_country HTTP requests by country
# TYPE http_requests_by_country counter
${geoMetricsLines || '# No geographic data collected yet\n'}`;
}

module.exports = {
  generateMetrics,
};
