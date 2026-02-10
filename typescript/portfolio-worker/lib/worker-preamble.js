/**
 * Worker preamble generator - constants, metrics, and utility functions.
 * Extracted from generate-worker.js template literal (L357-454).
 * @module worker-preamble
 */

/**
 * Generate the worker preamble code (constants, metrics, logging, auth).
 * @param {object} opts - Build-time values to interpolate
 * @param {string} opts.deployedAt - ISO timestamp of deployment
 * @param {string} opts.indexHtml - Escaped HTML content (Korean)
 * @param {string} opts.indexEnHtml - Escaped HTML content (English)
 * @param {string} opts.manifestJson - Escaped manifest.json content
 * @param {string} opts.serviceWorker - Escaped service worker JS
 * @param {string} opts.mainJs - Escaped main.js content
 * @param {string} opts.robotsTxt - Escaped robots.txt content
 * @param {string} opts.sitemapXml - Escaped sitemap.xml content
 * @param {string} opts.ogImageBase64 - Base64 OG image (Korean)
 * @param {string} opts.ogImageEnBase64 - Base64 OG image (English)
 * @param {string} opts.resumePdfBase64 - Base64 resume PDF
 * @param {string} opts.securityHeadersJson - JSON.stringify'd security headers (pretty)
 * @param {string} opts.metricsJson - JSON.stringify'd initial metrics (pretty)
 * @param {string} opts.initHistogramBucketsStr - initHistogramBuckets function source
 * @param {string} opts.generateHistogramLinesStr - generateHistogramLines function source
 * @param {string} opts.generateMetricsStr - generateMetrics function source
 * @param {string} opts.logToElasticsearchStr - logToElasticsearch function source
 * @param {string} opts.rateLimitConfigJson - JSON.stringify'd rate limit config
 * @param {string} opts.authHelpersStr - Generated auth helper code
 * @returns {string} Worker preamble code
 */
function generateWorkerPreamble(opts) {
  return `// Cloudflare Worker - Auto-generated (IMPROVED VERSION)
// Generated: ${opts.deployedAt}
// Features: Template caching, JSDoc types, link helper, constants, rate limiting

const INDEX_HTML = \`${opts.indexHtml}\`;
const INDEX_EN_HTML = \`${opts.indexEnHtml}\`;

const MANIFEST_JSON = \`${opts.manifestJson}\`;
const SERVICE_WORKER = \`${opts.serviceWorker}\`;
const MAIN_JS = \`${opts.mainJs}\`;

// SEO files
const ROBOTS_TXT = \`${opts.robotsTxt}\`;
const SITEMAP_XML = \`${opts.sitemapXml}\`;
const OG_IMAGE_BASE64 = '${opts.ogImageBase64}';
const OG_IMAGE_EN_BASE64 = '${opts.ogImageEnBase64}';
const RESUME_PDF_BASE64 = '${opts.resumePdfBase64}';

// Security headers
const SECURITY_HEADERS = ${opts.securityHeadersJson};

// Metrics
const metrics = ${opts.metricsJson};

// Histogram bucket boundaries (Prometheus standard)
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

${opts.initHistogramBucketsStr}

${opts.generateHistogramLinesStr}

${opts.generateMetricsStr}

function buildEcsDocument(message, level, labels, job) {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    message,
    log: { level: level.toLowerCase() },
    service: { name: job },
    ecs: { version: '8.11' },
    ...labels,
  };
}

// ES Logger module-level state (inlined from lib/es-logger.js)
const DEFAULT_TIMEOUT_MS = 5000;
const BATCH_SIZE = 10;
const BATCH_FLUSH_MS = 1000;
const MAX_QUEUE_SIZE = 1000;
let logQueue = [];
let flushTimer = null;

async function flushLogs(env, index) {
  if (logQueue.length === 0) return;

  const logs = logQueue.splice(0, logQueue.length);
  const esUrl = env?.ELASTICSEARCH_URL;
  const apiKey = env?.ELASTICSEARCH_API_KEY;

  if (!esUrl || !apiKey) return;

  const bulkBody =
    logs
      .map((doc) => {
        const action = JSON.stringify({ index: { _index: index } });
        const document = JSON.stringify(doc);
        return \`\${action}\\n\${document}\`;
      })
      .join('\\n') + '\\n';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(\`\${esUrl}/_bulk\`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: \`ApiKey \${apiKey}\`,
      },
      body: bulkBody,
    });
  } catch (err) {
    // Silently fail in worker - no logger dependency
  } finally {
    clearTimeout(timeoutId);
  }
}

${opts.logToElasticsearchStr}

const ipCache = new Map();
const RATE_LIMIT_CONFIG = ${opts.rateLimitConfigJson};

${opts.authHelpersStr}
`;
}

module.exports = { generateWorkerPreamble };
