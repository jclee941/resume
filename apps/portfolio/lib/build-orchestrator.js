/**
 * Worker build orchestration utilities
 * @module build-orchestrator
 */

const { ESCAPE_PATTERNS, TEMPLATE_CACHE } = require('./config');
const { extractStyleHashes, mergeHashes } = require('./csp-hash-generator');
const securityHeadersModule = require('./security-headers');
const { injectScriptNoncePlaceholder } = require('./templates');
const { readBuildInputs } = require('./file-reader');
const { processProjectData, encodeBinaryAssets } = require('./data-processor');
const { buildLocalizedHtml, escapeForTemplateLiteral } = require('./html-transformer');
const { buildAndWriteWorker } = require('./worker-writer');

/**
 * Execute full worker build process.
 * @param {{baseDir: string, version: string, allowedEmails: string[], logger: {log: Function, debug: Function, error: Function}}} options - Build options.
 */
async function runWorkerBuild({ baseDir, version, allowedEmails, logger }) {
  const buildStartTime = Date.now();

  const {
    indexHtmlRaw,
    indexEnHtmlRaw,
    projectDataRaw,
    manifestJson,
    serviceWorker,
    robotsTxt,
    sitemapXml,
    ogImageBuffer,
    ogImageEnBuffer,
    resumePdfBuffer,
    mainJs,
    cssContent,
  } = await readBuildInputs({ baseDir, logger });

  const { projectData, templates } = processProjectData({ projectDataRaw, logger });
  const resumeChatDataBase64Literal = `'${Buffer.from(JSON.stringify(projectData), 'utf-8').toString('base64')}'`;
  const workerAiModel = '@cf/meta/llama-2-7b-chat-int8';
  const { ogImageBase64, ogImageEnBase64, resumePdfBase64 } = encodeBinaryAssets({
    ogImageBuffer,
    ogImageEnBuffer,
    resumePdfBuffer,
  });

  logger.debug(`index.html size: ${indexHtmlRaw.length} bytes`);
  logger.debug(`styles.css size: ${cssContent.length} bytes`);
  logger.debug(
    `data.json: ${projectData.resume.length} resume items, ${projectData.projects.length} projects`
  );
  logger.debug(`manifest.json size: ${manifestJson.length} bytes`);
  logger.debug(`sw.js size: ${serviceWorker.length} bytes`);
  logger.log('✓ Source files loaded\n');

  let indexHtml = await buildLocalizedHtml(indexHtmlRaw, {
    cssContent,
    heroContentHtml: templates.heroContentHtml,
    resumeDescriptionHtml: templates.resumeDescriptionHtml,
    resumeCardsHtml: templates.resumeCardsHtml,
    projectCardsHtml: templates.projectCardsHtml,
    infrastructureCardsHtml: templates.infrastructureCardsHtml,
    certCardsHtml: templates.certCardsHtml,
    skillsHtml: templates.skillsHtml,
    contactGridHtml: templates.contactGridHtml,
    resumePdfUrl: projectData.resumeDownload.pdfUrl,
    resumeDocxUrl: projectData.resumeDownload.docxUrl,
    resumeMdUrl: projectData.resumeDownload.mdUrl,
    resumeChatDataBase64: resumeChatDataBase64Literal,
  });
  logger.log('✓ HTML minified\n');

  let indexEnHtml = await buildLocalizedHtml(indexEnHtmlRaw, {
    cssContent,
    heroContentHtml: templates.heroContentHtml,
    resumeDescriptionHtml: templates.resumeDescriptionHtml,
    resumeCardsHtml: templates.resumeCardsEnHtml,
    projectCardsHtml: templates.projectCardsEnHtml,
    infrastructureCardsHtml: templates.infrastructureCardsHtml,
    certCardsHtml: templates.certCardsHtml,
    skillsHtml: templates.skillsHtml,
    contactGridHtml: templates.contactGridHtml,
    resumePdfUrl: projectData.resumeDownload.pdfUrl,
    resumeDocxUrl: projectData.resumeDownload.docxUrl,
    resumeMdUrl: projectData.resumeDownload.mdUrl,
    resumeChatDataBase64: resumeChatDataBase64Literal,
  });
  logger.log('✓ English HTML processed\n');

  const styleHashes = mergeHashes(extractStyleHashes(indexHtml), extractStyleHashes(indexEnHtml));
  logger.log(`✓ CSP style hashes extracted: ${styleHashes.length} styles\n`);

  indexHtml = injectScriptNoncePlaceholder(indexHtml);
  indexEnHtml = injectScriptNoncePlaceholder(indexEnHtml);
  logger.log('✓ CSP nonce placeholders injected into <script> tags\n');

  indexHtml = escapeForTemplateLiteral(indexHtml, ESCAPE_PATTERNS);
  indexEnHtml = escapeForTemplateLiteral(indexEnHtml, ESCAPE_PATTERNS);
  logger.log('✓ Template literals escaped\n');

  const securityHeaders = securityHeadersModule.generateSecurityHeaders(styleHashes);
  const deployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
  const metrics = {
    requests_total: 0,
    requests_success: 0,
    requests_error: 0,
    response_time_sum: 0,
    response_times: [],
    vitals_received: 0,
    vitals_sum: { lcp: 0, fid: 0, cls: 0 },
    cache_hits: 0,
    cache_misses: 0,
    geo_countries: {},
    geo_colos: {},
    worker_start_time: Date.now(),
    version,
    deployed_at: deployedAt,
  };
  const rateLimitConfig = { windowSize: 60 * 1000, maxRequests: 30 };

  const { workerSizeKB } = buildAndWriteWorker({
    baseDir,
    deployedAt,
    indexHtml,
    indexEnHtml,
    manifestJson,
    serviceWorker,
    mainJs,
    robotsTxt,
    sitemapXml,
    ogImageBase64,
    ogImageEnBase64,
    resumePdfBase64,
    securityHeaders,
    metrics,
    rateLimitConfig,
    allowedEmails,
    resumeChatDataBase64: Buffer.from(JSON.stringify(projectData), 'utf-8').toString('base64'),
    aiModel: workerAiModel,
    version,
  });

  const buildTime = ((Date.now() - buildStartTime) / 1000).toFixed(2);
  if (parseFloat(workerSizeKB) > 900) {
    logger.error(`❌ Worker size ${workerSizeKB}KB exceeds 900KB limit!`);
    process.exit(1);
  }

  logger.log('✅ Improved worker.js generated successfully!');
  logger.log('\n📊 Build Statistics:');
  logger.log(`   - Build time: ${buildTime}s`);
  logger.log(`   - Worker size: ${workerSizeKB} KB`);
  logger.log(`   - Style hashes: ${styleHashes.length}`);
  logger.log('   - CSP mode: dynamic per-response nonce + strict-dynamic');
  logger.log(`   - Resume cards: ${projectData.resume.length}`);
  logger.log(`   - Project cards: ${projectData.projects.length}`);
  logger.log(`   - Template cache: ${TEMPLATE_CACHE.dataHash ? 'Active' : 'Empty'}`);
  logger.log(`   - Deployed at: ${deployedAt}`);
}

module.exports = {
  runWorkerBuild,
};
