/**
 * Record Web Vitals data.
 * @param {import('./collector').WorkerMetrics} collector - Metrics collector instance.
 * @param {Object} vitals - Web Vitals data.
 * @param {number} [vitals.lcp] - Largest Contentful Paint (ms).
 * @param {number} [vitals.inp] - Interaction to Next Paint (ms).
 * @param {number} [vitals.cls] - Cumulative Layout Shift.
 * @param {number} [vitals.fcp] - First Contentful Paint (ms).
 * @param {number} [vitals.ttfb] - Time to First Byte (ms).
 */
function recordWebVitals(collector, vitals) {
  collector.vitals_received++;
  const wv = collector.web_vitals;
  const n = wv.samples + 1;

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
  recordWebVitals,
};
