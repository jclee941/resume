const { ESCAPE_PATTERNS, TEMPLATE_CACHE } = require('./config');
const fs = require('fs');
const path = require('path');
const { extractStyleHashes, mergeHashes } = require('./csp-hash-generator');
const securityHeadersModule = require('./security-headers');
const { injectScriptNoncePlaceholder } = require('./templates');
const { readBuildInputs } = require('./file-reader');
const { processProjectData, encodeBinaryAssets } = require('./data-processor');
const { buildPortfolioPages, escapePortfolioPages } = require('./localized-page-builder');
const { buildAndWriteWorker } = require('./worker-writer');

function copyResumePdf(logger) {
  const pdfSource = path.resolve(
    __dirname,
    '../../../packages/data/resumes/master/resume_final.pdf'
  );
  const pdfDest = path.resolve(__dirname, '../assets/resume.pdf');
  if (fs.existsSync(pdfSource)) {
    fs.copyFileSync(pdfSource, pdfDest);
    logger.log('✓ Copied resume.pdf to assets\n');
    return;
  }
  logger.warn('⚠ resume_final.pdf not found at SSoT, skipping copy\n');
}

function assertResumePdfAvailable(resumePdfBuffer, logger) {
  if (resumePdfBuffer && resumePdfBuffer.length > 0) return;
  const message =
    'resume_final.pdf is missing or empty — /resume.pdf (served from the ' +
    'static assets binding) will be unavailable. ' +
    'Run `go run ./tools/scripts/build/pdf-generator.go master` to regenerate it.';
  if (process.env.RESUME_PDF_STRICT === '1') {
    throw new Error(message);
  }
  logger.warn(`⚠️  ${message}`);
}

function buildInitialMetrics({ version, deployedAt }) {
  return {
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
}

function logInputSummary({
  logger,
  indexHtmlRaw,
  cssContent,
  projectData,
  manifestJson,
  manifestEnJson,
}) {
  logger.debug(`index.html size: ${indexHtmlRaw.length} bytes`);
  logger.debug(`styles.css size: ${cssContent.length} bytes`);
  logger.debug(
    `data.json: ${projectData.resume.length} resume items, ${projectData.projects.length} projects`
  );
  logger.debug(`manifest.json size: ${manifestJson.length} bytes`);
  logger.debug(`manifest_en.json size: ${manifestEnJson.length} bytes`);
  logger.log('✓ Source files loaded\n');
}

function logBuildStats({
  logger,
  buildTime,
  workerSizeKB,
  styleHashes,
  projectData,
  deployedAt,
  gitSha,
}) {
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
  logger.log(`   - Git SHA: ${gitSha}`);
}

async function runWorkerBuild({ baseDir, version, gitSha = 'unknown', allowedEmails, logger }) {
  const buildStartTime = Date.now();
  const inputs = await readBuildInputs({ baseDir, logger });
  assertResumePdfAvailable(inputs.resumePdfBuffer, logger);

  const { projectData, templates } = processProjectData({
    projectDataRaw: inputs.projectDataRaw,
    projectDataEnRaw: inputs.projectDataEnRaw,
    projectDataJaRaw: inputs.projectDataJaRaw,
    logger,
  });
  const assets = encodeBinaryAssets({
    ogImageBuffer: inputs.ogImageBuffer,
    ogImageEnBuffer: inputs.ogImageEnBuffer,
    ogImageJaBuffer: inputs.ogImageJaBuffer,
  });

  logInputSummary({ logger, projectData, ...inputs });
  copyResumePdf(logger);

  const buildDeployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
  const buildDeployedDate = `${buildDeployedAt.slice(0, 10)} ${buildDeployedAt.slice(11, 16)}Z`;
  let pages = await buildPortfolioPages({
    indexHtmlRaw: inputs.indexHtmlRaw,
    indexEnHtmlRaw: inputs.indexEnHtmlRaw,
    cssContent: inputs.cssContent,
    projectData,
    projectDataEnRaw: inputs.projectDataEnRaw,
    projectDataJaRaw: inputs.projectDataJaRaw,
    templates,
    logger,
    version,
    buildDeployedAt,
    buildDeployedDate,
  });
  logger.log('✓ Localized HTML processed\n');

  const styleHashes = mergeHashes(
    extractStyleHashes(pages.indexHtml),
    extractStyleHashes(pages.indexEnHtml),
    extractStyleHashes(pages.indexJaHtml)
  );
  logger.log(`✓ CSP style hashes extracted: ${styleHashes.length} styles\n`);

  pages = {
    indexHtml: injectScriptNoncePlaceholder(pages.indexHtml),
    indexEnHtml: injectScriptNoncePlaceholder(pages.indexEnHtml),
    indexJaHtml: injectScriptNoncePlaceholder(pages.indexJaHtml),
  };
  logger.log('✓ CSP nonce placeholders injected into <script> tags\n');

  pages = escapePortfolioPages(pages, ESCAPE_PATTERNS);
  logger.log('✓ Template literals escaped\n');

  const deployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
  const resolvedGitSha = gitSha || 'unknown';
  const { workerSizeKB } = buildAndWriteWorker({
    baseDir,
    deployedAt,
    gitSha: resolvedGitSha,
    indexHtml: pages.indexHtml,
    indexEnHtml: pages.indexEnHtml,
    indexJaHtml: pages.indexJaHtml,
    manifestJson: inputs.manifestJson,
    manifestEnJson: inputs.manifestEnJson,
    serviceWorker: inputs.serviceWorker,
    mainJs: inputs.mainJs,
    robotsTxt: inputs.robotsTxt,
    sitemapXml: inputs.sitemapXml,
    ...assets,
    securityHeaders: securityHeadersModule.generateSecurityHeaders(styleHashes),
    metrics: buildInitialMetrics({ version, deployedAt }),
    rateLimitConfig: { windowSize: 60 * 1000, maxRequests: 30 },
    allowedEmails,
    version,
  });

  if (parseFloat(workerSizeKB) > 1300) {
    logger.error(`❌ Worker size ${workerSizeKB}KB exceeds 1300KB sanity limit!`);
    process.exit(1);
  }

  logBuildStats({
    logger,
    buildTime: ((Date.now() - buildStartTime) / 1000).toFixed(2),
    workerSizeKB,
    styleHashes,
    projectData,
    deployedAt,
    gitSha: resolvedGitSha,
  });
}

module.exports = { runWorkerBuild };
