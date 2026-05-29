/**
 * Worker build orchestration utilities
 * @module build-orchestrator
 */

const { ESCAPE_PATTERNS, TEMPLATE_CACHE } = require('./config');
const fs = require('fs');
const path = require('path');
const { extractStyleHashes, mergeHashes } = require('./csp-hash-generator');
const securityHeadersModule = require('./security-headers');
const { injectScriptNoncePlaceholder } = require('./templates');
const { readBuildInputs } = require('./file-reader');
const { processProjectData, encodeBinaryAssets } = require('./data-processor');
const { buildJapaneseTemplate, buildLocalizedHtml, escapeForTemplateLiteral } = require('./html-transformer');
const { buildAndWriteWorker } = require('./worker-writer');

/**
 * Execute full worker build process.
 * @param {{baseDir: string, version: string, gitSha?: string, allowedEmails: string[], logger: {log: Function, debug: Function, error: Function}}} options - Build options.
 */
async function runWorkerBuild({ baseDir, version, gitSha = 'unknown', allowedEmails, logger }) {
  const buildStartTime = Date.now();

  const {
    indexHtmlRaw,
    indexEnHtmlRaw,
    projectDataRaw,
    projectDataEnRaw,
    projectDataJaRaw,
    manifestJson,
    manifestEnJson,
    serviceWorker,
    robotsTxt,
    sitemapXml,
    ogImageBuffer,
    ogImageEnBuffer,
    ogImageJaBuffer,
    resumePdfBuffer,
    mainJs,
    cssContent,
  } = await readBuildInputs({ baseDir, logger });

  if (!resumePdfBuffer || resumePdfBuffer.length === 0) {
    // Missing/empty PDF historically shipped a 0-byte /resume.pdf body.
    // Default behaviour: warn loudly so it is visible in CI logs but still
    // produce a worker (Cloudflare Workers Builds clone the repo without
    // the gitignored PDF artefact, so a hard throw would block production
    // deploys). Opt into strict mode with RESUME_PDF_STRICT=1 to abort the
    // build instead — useful for release pipelines that regenerate the PDF.
    const message =
      'resume_final.pdf is missing or empty \u2014 the /resume.pdf route ' +
      'will return a 0-byte body. ' +
      'Run `go run ./tools/scripts/build/pdf-generator.go master` to regenerate it.';
    if (process.env.RESUME_PDF_STRICT === '1') {
      throw new Error(message);
    }
    logger.warn('\u26a0\ufe0f  ' + message);
  }

  const { projectData, templates } = processProjectData({ projectDataRaw, projectDataEnRaw, projectDataJaRaw, logger });
  const resumeChatDataBase64Literal = `'${Buffer.from(JSON.stringify(projectData), 'utf-8').toString('base64')}'`;
  const workerAiModel = '@cf/meta/llama-2-7b-chat-int8';
  const { ogImageBase64, ogImageEnBase64, ogImageJaBase64, resumePdfBase64 } = encodeBinaryAssets({
    ogImageBuffer,
    ogImageEnBuffer,
    ogImageJaBuffer,
    resumePdfBuffer,
  });

  logger.debug(`index.html size: ${indexHtmlRaw.length} bytes`);
  logger.debug(`styles.css size: ${cssContent.length} bytes`);
  logger.debug(
    `data.json: ${projectData.resume.length} resume items, ${projectData.projects.length} projects`
  );
  logger.debug(`manifest.json size: ${manifestJson.length} bytes`);
  logger.debug(`manifest_en.json size: ${manifestEnJson.length} bytes`);
  logger.debug(`sw.js size: ${serviceWorker.length} bytes`);
  logger.log('✓ Source files loaded\n');

  // Copy latest resume PDF into assets so worker can serve /resume.pdf
  const pdfSource = path.resolve(__dirname, '../../../packages/data/resumes/master/resume_final.pdf');
  const pdfDest = path.resolve(__dirname, '../assets/resume.pdf');
  if (fs.existsSync(pdfSource)) {
    fs.copyFileSync(pdfSource, pdfDest);
    logger.log('✓ Copied resume.pdf to assets\n');
  } else {
    logger.warn('⚠ resume_final.pdf not found at SSoT, skipping copy\n');
  }

  // Build metadata (used to populate footer build line at static build time, not runtime)
  const buildDeployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
  const buildDeployedDate = `${buildDeployedAt.slice(0, 10)} ${buildDeployedAt.slice(11, 16)}Z`;

  let indexHtml = await buildLocalizedHtml(indexHtmlRaw, {
    cssContent,
    resumeCardsHtml: templates.resumeCardsHtml,
    projectCardsHtml: templates.projectCardsHtml,
    infrastructureCardsHtml: templates.infrastructureCardsHtml,
    skillsHtml: templates.skillsHtml,
    certCardsHtml: templates.certCardsHtml,
    contactGridHtml: templates.contactGridHtml,
    aboutContentHtml: templates.aboutContentHtml,
    resumeChatDataBase64: resumeChatDataBase64Literal,
    buildVersion: version,
    buildDeployedAt,
    buildDeployedDate,
  });
  logger.log('✓ HTML minified\n');

  let indexEnHtml = await buildLocalizedHtml(indexEnHtmlRaw, {
    cssContent,
    resumeCardsHtml: templates.resumeCardsEnHtml,
    projectCardsHtml: templates.projectCardsEnHtml,
    infrastructureCardsHtml: templates.infrastructureCardsEnHtml,
    skillsHtml: templates.skillsEnHtml,
    certCardsHtml: templates.certCardsHtml,
    contactGridHtml: templates.contactGridHtml,
    aboutContentHtml: templates.aboutContentEnHtml,
    resumeChatDataBase64: resumeChatDataBase64Literal,
    buildVersion: version,
    buildDeployedAt,
    buildDeployedDate,
  });
  logger.log('✓ English HTML processed\n');

  let indexJaHtml = await buildLocalizedHtml(buildJapaneseTemplate(indexHtmlRaw), {
    cssContent,
    resumeCardsHtml: templates.resumeCardsJaHtml,
    projectCardsHtml: templates.projectCardsJaHtml,
    infrastructureCardsHtml: templates.infrastructureCardsJaHtml,
    skillsHtml: templates.skillsJaHtml,
    certCardsHtml: templates.certCardsHtml,
    contactGridHtml: templates.contactGridHtml,
    aboutContentHtml: templates.aboutContentJaHtml,
    buildVersion: version,
    buildDeployedAt,
    buildDeployedDate,
    resumeChatDataBase64: resumeChatDataBase64Literal,
  });
  logger.log('✓ Japanese HTML processed\n');

  const styleHashes = mergeHashes(
    extractStyleHashes(indexHtml),
    extractStyleHashes(indexEnHtml),
    extractStyleHashes(indexJaHtml)
  );
  logger.log(`✓ CSP style hashes extracted: ${styleHashes.length} styles\n`);

  indexHtml = injectScriptNoncePlaceholder(indexHtml);
  indexEnHtml = injectScriptNoncePlaceholder(indexEnHtml);
  indexJaHtml = injectScriptNoncePlaceholder(indexJaHtml);
  logger.log('✓ CSP nonce placeholders injected into <script> tags\n');

  indexHtml = escapeForTemplateLiteral(indexHtml, ESCAPE_PATTERNS);
  indexEnHtml = escapeForTemplateLiteral(indexEnHtml, ESCAPE_PATTERNS);
  indexJaHtml = escapeForTemplateLiteral(indexJaHtml, ESCAPE_PATTERNS);
  logger.log('✓ Template literals escaped\n');

  const securityHeaders = securityHeadersModule.generateSecurityHeaders(styleHashes);
  const deployedAt = process.env.DEPLOYED_AT || new Date().toISOString();
  const resolvedGitSha = gitSha || 'unknown';
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
    gitSha: resolvedGitSha,
    indexHtml,
    indexEnHtml,
    indexJaHtml,
    manifestJson,
    manifestEnJson,
    serviceWorker,
    mainJs,
    robotsTxt,
    sitemapXml,
    ogImageBase64,
    ogImageEnBase64,
    ogImageJaBase64,
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
  // Cloudflare Workers limit is 1024KB after compression; uncompressed worker.js typically
  // compresses ~3-4x. Sanity threshold raised to 1300KB uncompressed (≈ 350KB compressed).
  if (parseFloat(workerSizeKB) > 1300) {
    logger.error(`❌ Worker size ${workerSizeKB}KB exceeds 1300KB sanity limit!`);
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
  logger.log(`   - Git SHA: ${resolvedGitSha}`);
}

module.exports = {
  runWorkerBuild,
};
