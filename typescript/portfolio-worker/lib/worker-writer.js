/**
 * Worker composition and file writing utilities
 * @module worker-writer
 */

const fs = require('fs');
const path = require('path');
const metricsModule = require('./metrics');
const esLoggerModule = require('./es-logger');
const authModule = require('./auth');
const { generateWorkerPreamble } = require('./worker-preamble');
const {
  generateFetchAndRateLimit,
  generatePageRoutes,
  generateStaticRoutes,
  generateHealthRoute,
  generateMetricsRoute,
  generateSeoRoutes,
  generate404,
  generateErrorHandler,
} = require('./worker-routes');
const {
  generateAuthRoutes,
  generateControlRoutes,
  generateChatRoute,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
} = require('./worker-api-routes');

/**
 * Build complete worker source code.
 * @param {Object} options - Worker generation options.
 * @returns {string} Worker source code.
 */
function buildWorkerCode(options) {
  const preambleOpts = {
    deployedAt: options.deployedAt,
    indexHtml: options.indexHtml,
    indexEnHtml: options.indexEnHtml || options.indexHtml,
    manifestJson: options.manifestJson,
    serviceWorker: options.serviceWorker,
    mainJs: options.mainJs,
    robotsTxt: options.robotsTxt,
    sitemapXml: options.sitemapXml,
    ogImageBase64: options.ogImageBase64,
    ogImageEnBase64: options.ogImageEnBase64 || options.ogImageBase64,
    resumePdfBase64: options.resumePdfBase64,
    securityHeadersJson: JSON.stringify(options.securityHeaders, null, 2),
    metricsJson: JSON.stringify(options.metrics, null, 2),
    initHistogramBucketsStr: metricsModule.initHistogramBuckets.toString(),
    generateHistogramLinesStr: metricsModule.generateHistogramLines.toString(),
    generateMetricsStr: metricsModule.generateMetrics.toString(),
    logToElasticsearchStr: esLoggerModule.logToElasticsearch.toString(),
    rateLimitConfigJson: JSON.stringify(options.rateLimitConfig),
    authHelpersStr: authModule.generateAuthHelpers(),
  };

  return (
    generateWorkerPreamble(preambleOpts) +
    generateFetchAndRateLimit() +
    generatePageRoutes() +
    generateAuthRoutes({ allowedEmailsJson: JSON.stringify(options.allowedEmails) }) +
    generateControlRoutes() +
    generateChatRoute({
      resumeChatDataBase64: options.resumeChatDataBase64,
      aiModel: options.aiModel,
    }) +
    generateCfStatsRoute() +
    generateStaticRoutes() +
    generateHealthRoute({ version: options.version, deployedAt: options.deployedAt }) +
    generateMetricsRoute() +
    generateVitalsRoute() +
    generateTrackRoute() +
    generateAnalyticsRoute() +
    generateMetricsPostRoute() +
    generateMetricsGetRoute() +
    generateMetricsSnapshotRoute() +
    generateSeoRoutes() +
    generate404() +
    generateErrorHandler({ version: options.version })
  );
}

/**
 * Write generated worker code to worker.js.
 * @param {{baseDir: string, workerCode: string}} options - Output options.
 */
function writeWorkerFile({ baseDir, workerCode }) {
  fs.writeFileSync(path.join(baseDir, 'worker.js'), workerCode);
}

/**
 * Build, write, and report size for worker output.
 * @param {{baseDir: string} & Object} options - Worker generation options.
 * @returns {{workerCode: string, workerSizeKB: string}} Worker output data.
 */
function buildAndWriteWorker(options) {
  const workerCode = buildWorkerCode(options);
  writeWorkerFile({ baseDir: options.baseDir, workerCode });

  return {
    workerCode,
    workerSizeKB: (Buffer.byteLength(workerCode, 'utf-8') / 1024).toFixed(2),
  };
}

module.exports = {
  buildWorkerCode,
  writeWorkerFile,
  buildAndWriteWorker,
};
