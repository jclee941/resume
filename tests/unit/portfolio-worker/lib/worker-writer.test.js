/**
 * @file Unit tests for worker-writer.js
 */

const path = require('path');

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/metrics', () => ({
  initHistogramBuckets: jest.fn(function initHistogramBuckets() {}),
  generateHistogramLines: jest.fn(function generateHistogramLines() {}),
  generateMetrics: jest.fn(function generateMetrics() {}),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/es-logger', () => ({
  logToElasticsearch: jest.fn(async function logToElasticsearch() {}),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/auth', () => ({
  generateAuthHelpers: jest.fn(() => '// generated auth helpers'),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/worker-preamble', () => ({
  generateWorkerPreamble: jest.fn(() => '/* preamble */\n'),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/worker-routes', () => ({
  generateFetchAndRateLimit: jest.fn(() => '/* fetch-rate-limit */\n'),
  generatePageRoutes: jest.fn(() => '/* page-routes */\n'),
  generateStaticRoutes: jest.fn(() => '/* static-routes */\n'),
  generateHealthRoute: jest.fn(() => '/* health-route */\n'),
  generateMetricsRoute: jest.fn(() => '/* metrics-route */\n'),
  generateSeoRoutes: jest.fn(() => '/* seo-routes */\n'),
  generate404: jest.fn(() => '/* 404 */\n'),
  generateErrorHandler: jest.fn(() => '/* error-handler */\n'),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/routes', () => ({
  generateAuthRoutes: jest.fn(() => '/* auth-routes */\n'),
  generateControlRoutes: jest.fn(() => '/* control-routes */\n'),
  generateChatRoute: jest.fn(() => '/* chat-route */\n'),
  generateCfStatsRoute: jest.fn(() => '/* cf-stats-route */\n'),
  generateVitalsRoute: jest.fn(() => '/* vitals-route */\n'),
  generateTrackRoute: jest.fn(() => '/* track-route */\n'),
  generateAnalyticsRoute: jest.fn(() => '/* analytics-route */\n'),
  generateMetricsPostRoute: jest.fn(() => '/* metrics-post-route */\n'),
  generateMetricsGetRoute: jest.fn(() => '/* metrics-get-route */\n'),
  generateMetricsSnapshotRoute: jest.fn(() => '/* metrics-snapshot-route */\n'),
}));

const fs = require('fs');
const {
  buildWorkerCode,
  writeWorkerFile,
  buildAndWriteWorker,
} = require('../../../../typescript/portfolio-worker/lib/worker-writer');
const {
  generateWorkerPreamble,
} = require('../../../../typescript/portfolio-worker/lib/worker-preamble');
const workerRoutes = require('../../../../typescript/portfolio-worker/lib/worker-routes');
const routes = require('../../../../typescript/portfolio-worker/lib/routes');

function createMinimalOptions(overrides = {}) {
  return {
    deployedAt: '2024-01-01T00:00:00Z',
    indexHtml: '<html>ko</html>',
    indexEnHtml: '<html>en</html>',
    manifestJson: '{}',
    serviceWorker: '// sw',
    mainJs: '// main',
    robotsTxt: 'User-agent: *',
    sitemapXml: '<urlset/>',
    ogImageBase64: 'og==',
    ogImageEnBase64: 'ogen==',
    resumePdfBase64: 'pdf==',
    securityHeaders: { 'X-Frame-Options': 'DENY' },
    metrics: { requests_total: 0 },
    rateLimitConfig: {},
    allowedEmails: ['test@example.com'],
    version: '1.0.0',
    baseDir: '/tmp/test-worker',
    resumeChatDataBase64: 'chat==',
    aiModel: 'gpt-4',
    ...overrides,
  };
}

describe('worker-writer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildWorkerCode', () => {
    it('should return a string containing all generator outputs concatenated', () => {
      const result = buildWorkerCode(createMinimalOptions());
      expect(typeof result).toBe('string');

      // All mock outputs should be present
      expect(result).toContain('/* preamble */');
      expect(result).toContain('/* fetch-rate-limit */');
      expect(result).toContain('/* page-routes */');
      expect(result).toContain('/* auth-routes */');
      expect(result).toContain('/* control-routes */');
      expect(result).toContain('/* chat-route */');
      expect(result).toContain('/* cf-stats-route */');
      expect(result).toContain('/* static-routes */');
      expect(result).toContain('/* health-route */');
      expect(result).toContain('/* metrics-route */');
      expect(result).toContain('/* vitals-route */');
      expect(result).toContain('/* track-route */');
      expect(result).toContain('/* analytics-route */');
      expect(result).toContain('/* metrics-post-route */');
      expect(result).toContain('/* metrics-get-route */');
      expect(result).toContain('/* metrics-snapshot-route */');
      expect(result).toContain('/* seo-routes */');
      expect(result).toContain('/* 404 */');
      expect(result).toContain('/* error-handler */');
    });

    it('should call generateWorkerPreamble with correct opts', () => {
      buildWorkerCode(createMinimalOptions());
      expect(generateWorkerPreamble).toHaveBeenCalledTimes(1);

      const preambleOpts = generateWorkerPreamble.mock.calls[0][0];
      expect(preambleOpts.deployedAt).toBe('2024-01-01T00:00:00Z');
      expect(preambleOpts.indexHtml).toBe('<html>ko</html>');
      expect(preambleOpts.indexEnHtml).toBe('<html>en</html>');
      expect(preambleOpts.ogImageBase64).toBe('og==');
      expect(preambleOpts.resumePdfBase64).toBe('pdf==');
    });

    it('should pass securityHeaders as JSON string', () => {
      buildWorkerCode(createMinimalOptions());
      const preambleOpts = generateWorkerPreamble.mock.calls[0][0];
      expect(preambleOpts.securityHeadersJson).toBe(
        JSON.stringify({ 'X-Frame-Options': 'DENY' }, null, 2)
      );
    });

    it('should pass metrics as JSON string', () => {
      buildWorkerCode(createMinimalOptions());
      const preambleOpts = generateWorkerPreamble.mock.calls[0][0];
      expect(preambleOpts.metricsJson).toBe(JSON.stringify({ requests_total: 0 }, null, 2));
    });

    it('should call generateHealthRoute with version and deployedAt', () => {
      buildWorkerCode(createMinimalOptions());
      expect(workerRoutes.generateHealthRoute).toHaveBeenCalledWith({
        version: '1.0.0',
        deployedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should call generateErrorHandler with version', () => {
      buildWorkerCode(createMinimalOptions());
      expect(workerRoutes.generateErrorHandler).toHaveBeenCalledWith({
        version: '1.0.0',
      });
    });

    it('should call generateAuthRoutes with allowedEmailsJson', () => {
      buildWorkerCode(createMinimalOptions());
      expect(routes.generateAuthRoutes).toHaveBeenCalledWith({
        allowedEmailsJson: JSON.stringify(['test@example.com']),
      });
    });

    it('should call generateChatRoute with chatData and aiModel', () => {
      buildWorkerCode(createMinimalOptions());
      expect(routes.generateChatRoute).toHaveBeenCalledWith({
        resumeChatDataBase64: 'chat==',
        aiModel: 'gpt-4',
      });
    });

    it('should fallback indexEnHtml to indexHtml when not provided', () => {
      const opts = createMinimalOptions();
      delete opts.indexEnHtml;
      buildWorkerCode(opts);
      const preambleOpts = generateWorkerPreamble.mock.calls[0][0];
      expect(preambleOpts.indexEnHtml).toBe('<html>ko</html>');
    });

    it('should fallback ogImageEnBase64 to ogImageBase64 when not provided', () => {
      const opts = createMinimalOptions();
      delete opts.ogImageEnBase64;
      buildWorkerCode(opts);
      const preambleOpts = generateWorkerPreamble.mock.calls[0][0];
      expect(preambleOpts.ogImageEnBase64).toBe('og==');
    });

    it('should call all route generators', () => {
      buildWorkerCode(createMinimalOptions());

      expect(workerRoutes.generateFetchAndRateLimit).toHaveBeenCalledTimes(1);
      expect(workerRoutes.generatePageRoutes).toHaveBeenCalledTimes(1);
      expect(workerRoutes.generateStaticRoutes).toHaveBeenCalledTimes(1);
      expect(workerRoutes.generateMetricsRoute).toHaveBeenCalledTimes(1);
      expect(workerRoutes.generateSeoRoutes).toHaveBeenCalledTimes(1);
      expect(workerRoutes.generate404).toHaveBeenCalledTimes(1);
      expect(routes.generateControlRoutes).toHaveBeenCalledTimes(1);
      expect(routes.generateCfStatsRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateVitalsRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateTrackRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateAnalyticsRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateMetricsPostRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateMetricsGetRoute).toHaveBeenCalledTimes(1);
      expect(routes.generateMetricsSnapshotRoute).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeWorkerFile', () => {
    it('should write worker code to worker.js in baseDir', () => {
      writeWorkerFile({ baseDir: '/tmp/test-dir', workerCode: '// worker code' });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/tmp/test-dir', 'worker.js'),
        '// worker code'
      );
    });

    it('should handle different baseDir paths', () => {
      writeWorkerFile({ baseDir: '/home/user/project', workerCode: 'code' });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/home/user/project', 'worker.js'),
        'code'
      );
    });
  });

  describe('buildAndWriteWorker', () => {
    it('should return workerCode and workerSizeKB', () => {
      const result = buildAndWriteWorker(createMinimalOptions());

      expect(result).toHaveProperty('workerCode');
      expect(result).toHaveProperty('workerSizeKB');
      expect(typeof result.workerCode).toBe('string');
      expect(typeof result.workerSizeKB).toBe('string');
    });

    it('should write to the correct file', () => {
      buildAndWriteWorker(createMinimalOptions({ baseDir: '/output' }));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/output', 'worker.js'),
        expect.any(String)
      );
    });

    it('should calculate size in KB correctly', () => {
      const result = buildAndWriteWorker(createMinimalOptions());
      const expectedSize = (Buffer.byteLength(result.workerCode, 'utf-8') / 1024).toFixed(2);
      expect(result.workerSizeKB).toBe(expectedSize);
    });

    it('should call both buildWorkerCode and writeWorkerFile', () => {
      buildAndWriteWorker(createMinimalOptions());
      // buildWorkerCode is verified by the generators being called
      expect(generateWorkerPreamble).toHaveBeenCalledTimes(1);
      // writeWorkerFile is verified by fs.writeFileSync being called
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
