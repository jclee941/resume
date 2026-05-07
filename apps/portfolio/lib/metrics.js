const { createMetricsCollector, recordRequest } = require('./metrics/collector');
const { generateMetrics } = require('./metrics/exposition');
const {
  HISTOGRAM_BUCKETS,
  generateHistogramLines,
  initHistogramBuckets,
  observeHistogram,
} = require('./metrics/histogram');
const { recordWebVitals } = require('./metrics/web-vitals');

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
