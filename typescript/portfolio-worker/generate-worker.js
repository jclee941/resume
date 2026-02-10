const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const esbuild = require('esbuild');

// Import modularized components
const { ESCAPE_PATTERNS, TEMPLATE_CACHE } = require('./lib/config');
const { validateData } = require('./lib/validators');
const { calculateDataHash, readAllFiles } = require('./lib/utils');
const { extractInlineHashes } = require('./lib/templates');
const {
  generateResumeCards,
  generateProjectCards,
  generateCertificationCards,
  generateSkillsList,
  generateHeroContent,
  generateResumeDescription,
  generateInfrastructureCards,
  generateContactGrid,
} = require('./lib/cards');
const securityHeadersModule = require('./lib/security-headers');
const metricsModule = require('./lib/metrics');
const esLoggerModule = require('./lib/es-logger');
const authModule = require('./lib/auth');
const { generateWorkerPreamble } = require('./lib/worker-preamble');
const {
  generateFetchAndRateLimit,
  generatePageRoutes,
  generateStaticRoutes,
  generateHealthRoute,
  generateMetricsRoute,
  generateSeoRoutes,
  generate404,
  generateErrorHandler,
} = require('./lib/worker-routes');
const {
  generateAuthRoutes,
  generateControlRoutes,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
} = require('./lib/worker-api-routes');
const logger = require('./logger');

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

// ========================================
// TYPE DEFINITIONS (JSDoc)
// ========================================

/**
 * @typedef {Object} ResumeProject
 * @property {string} icon - Emoji icon for the project
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {string[]} stats - Array of stats/tags
 * @property {boolean} [highlight] - Whether to highlight this card
 * @property {string} [completePdfUrl] - URL for complete PDF (highlighted cards)
 * @property {string} [pdfUrl] - URL for PDF (standard cards)
 * @property {string} [docxUrl] - URL for DOCX (standard cards)
 */

/**
 * @typedef {Object} Dashboard
 * @property {string} name - Dashboard name
 * @property {string} url - Dashboard URL
 */

/**
 * @typedef {Object} Project
 * @property {string} icon - Emoji icon for the project
 * @property {string} title - Project title
 * @property {string} tech - Technology stack
 * @property {string} description - Project description
 * @property {Dashboard[]} [dashboards] - Array of dashboards (for Grafana project)
 * @property {string} [documentationUrl] - Documentation URL
 * @property {string} [liveUrl] - Live demo URL
 * @property {string} [repoUrl] - Repository URL (GitHub/GitLab)
 */

/**
 * @typedef {Object} LinkConfig
 * @property {string} url - Link URL
 * @property {string} text - Link text
 * @property {string} className - CSS class name
 * @property {string} ariaLabel - Accessibility label
 * @property {boolean} [isExternal] - Whether link opens in new tab
 * @property {boolean} [isDownload] - Whether link is a download
 */

// ========================================
// SECURITY & AUTH CONFIGURATION
// ========================================
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(',').map((e) => e.trim())
  : [];
// Note: In a real Worker, env vars are better, but for build-time generation we can inject defaults
// or rely on env vars present at runtime (env object).
const _GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Cloudflare API Config - MUST be set via environment variables or Cloudflare Worker bindings
// SECURITY: Never hardcode API keys in source code
const _N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.jclee.me/webhook';

// ========================================
// MAIN BUILD PROCESS
// ========================================

// Main async function to handle Promise-based minification
(async () => {
  // Only run if not in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const buildStartTime = Date.now();
  logger.log('🚀 Starting improved worker generation...\n');
  logger.debug('Build configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    DEBUG: process.env.DEBUG,
    VERBOSE: process.env.VERBOSE,
    VERSION,
  });

  // CRITICAL: Calculate hashes from ORIGINAL HTML before escaping
  // (Browsers calculate hashes from the actual HTML they receive, not the escaped template literal)
  logger.log('📂 Reading source files...');

  const filesToRead = [
    {
      path: path.join(__dirname, 'index.html'),
      encoding: 'utf-8',
      name: 'indexHtmlRaw',
    },
    {
      path: path.join(__dirname, 'index-en.html'),
      encoding: 'utf-8',
      name: 'indexEnHtmlRaw',
    },
    {
      path: path.join(__dirname, 'data.json'),
      encoding: 'utf-8',
      name: 'projectDataRaw',
    },
    {
      path: path.join(__dirname, 'manifest.json'),
      encoding: 'utf-8',
      name: 'manifestJson',
    },
    {
      path: path.join(__dirname, 'sw.js'),
      encoding: 'utf-8',
      name: 'serviceWorker',
    },
    {
      path: path.join(__dirname, 'robots.txt'),
      encoding: 'utf-8',
      name: 'robotsTxt',
    },
    {
      path: path.join(__dirname, 'sitemap.xml'),
      encoding: 'utf-8',
      name: 'sitemapXml',
    },

    {
      path: path.join(__dirname, 'og-image.webp'),
      encoding: null,
      name: 'ogImageBuffer',
    },
    {
      path: path.join(__dirname, 'og-image-en.webp'),
      encoding: null,
      name: 'ogImageEnBuffer',
    },
    {
      path: path.join(__dirname, '..', 'data', 'resumes', 'master', 'resume_final.pdf'),
      encoding: null,
      name: 'resumePdfBuffer',
    },
  ];

  const fileContents = readAllFiles(filesToRead);

  // Bundle main.js using esbuild
  logger.log('📦 Bundling main.js...');
  const bundleResult = await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'scripts', 'main.js')],
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
    target: ['es2020'],
    absWorkingDir: __dirname,
  });

  const mainJs = bundleResult.outputFiles[0].text
    .replace(ESCAPE_PATTERNS.BACKSLASH, '\\\\')
    .replace(ESCAPE_PATTERNS.BACKTICK, '\\`')
    .replace(ESCAPE_PATTERNS.DOLLAR, '\\$');

  // Bundle CSS using esbuild
  logger.log('📦 Bundling CSS...');
  const cssBundleResult = await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'styles', 'main.css')],
    bundle: true,
    minify: true,
    write: false,
  });

  const cssContent = cssBundleResult.outputFiles[0].text;

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
  } = fileContents;

  const projectData = JSON.parse(projectDataRaw);
  const ogImageBase64 = ogImageBuffer.toString('base64');
  const ogImageEnBase64 = ogImageEnBuffer.toString('base64');
  const resumePdfBase64 = resumePdfBuffer.toString('base64');

  logger.debug(`index.html size: ${indexHtmlRaw.length} bytes`);
  logger.debug(`styles.css size: ${cssContent.length} bytes`);
  logger.debug(
    `data.json: ${projectData.resume.length} resume items, ${projectData.projects.length} projects`
  );
  logger.debug(`manifest.json size: ${manifestJson.length} bytes`);
  logger.debug(`sw.js size: ${serviceWorker.length} bytes`);

  logger.log('✓ Source files loaded\n');

  // Validate data.json structure
  logger.log('🔍 Validating data.json...');
  validateData(projectData);

  // Calculate data hash for caching
  const dataHash = calculateDataHash(projectData);
  if (TEMPLATE_CACHE.dataHash !== dataHash) {
    logger.log('📝 Data changed, regenerating templates...');
    TEMPLATE_CACHE.dataHash = dataHash;
  }

  // Generate dynamic HTML content (with caching)
  const resumeCardsHtml = generateResumeCards(projectData.resume, dataHash);
  const projectCardsHtml = generateProjectCards(projectData.projects, dataHash);
  const resumeCardsEnHtml = generateResumeCards(
    projectData.resumeEn || projectData.resume,
    `${dataHash}:en-resume`
  );
  const projectCardsEnHtml = generateProjectCards(
    projectData.projectsEn || projectData.projects,
    `${dataHash}:en-projects`
  );
  const certCardsHtml = generateCertificationCards(projectData.certifications, dataHash);
  const skillsHtml = generateSkillsList(projectData.skills, dataHash);
  const heroContentHtml = generateHeroContent(projectData.hero);
  const resumeDescriptionHtml = generateResumeDescription(
    projectData.sectionDescriptions.resume,
    projectData.achievements
  );
  const infrastructureCardsHtml = generateInfrastructureCards(projectData.infrastructure);
  const contactGridHtml = generateContactGrid(projectData.contact);

  // Inject CSS, resume cards, project cards and resume download URLs into HTML
  let indexHtml = indexHtmlRaw
    .replace('<!-- CSS_PLACEHOLDER -->', cssContent)
    .replace('<!-- HERO_CONTENT_PLACEHOLDER -->', heroContentHtml)
    .replace('<!-- RESUME_DESCRIPTION_PLACEHOLDER -->', resumeDescriptionHtml)
    .replace('<!-- RESUME_CARDS_PLACEHOLDER -->', resumeCardsHtml)
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', projectCardsHtml)
    .replace('<!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->', infrastructureCardsHtml)
    .replace('<!-- CERTIFICATION_CARDS_PLACEHOLDER -->', certCardsHtml)
    .replace('<!-- SKILLS_LIST_PLACEHOLDER -->', skillsHtml)
    .replace('<!-- CONTACT_GRID_PLACEHOLDER -->', contactGridHtml)
    .replace('<!-- RESUME_PDF_URL -->', projectData.resumeDownload.pdfUrl)
    .replace('<!-- RESUME_DOCX_URL -->', projectData.resumeDownload.docxUrl)
    .replace('<!-- RESUME_MD_URL -->', projectData.resumeDownload.mdUrl);

  logger.log('✓ Templates generated successfully\n');

  // PHASE 1: Minify HTML
  indexHtml = await minify(indexHtml, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: { level: 0 },
    minifyJS: true,
  });
  logger.log('✓ HTML minified\n');

  // PHASE 3.5: Process English HTML (index-en.html)
  let indexEnHtml = indexEnHtmlRaw
    .replace('<!-- CSS_PLACEHOLDER -->', cssContent)
    .replace('<!-- HERO_CONTENT_PLACEHOLDER -->', heroContentHtml)
    .replace('<!-- RESUME_DESCRIPTION_PLACEHOLDER -->', resumeDescriptionHtml)
    .replace('<!-- RESUME_CARDS_PLACEHOLDER -->', resumeCardsEnHtml)
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', projectCardsEnHtml)
    .replace('<!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->', infrastructureCardsHtml)
    .replace('<!-- CERTIFICATION_CARDS_PLACEHOLDER -->', certCardsHtml)
    .replace('<!-- SKILLS_LIST_PLACEHOLDER -->', skillsHtml)
    .replace('<!-- CONTACT_GRID_PLACEHOLDER -->', contactGridHtml)
    .replace('<!-- RESUME_PDF_URL -->', projectData.resumeDownload.pdfUrl)
    .replace('<!-- RESUME_DOCX_URL -->', projectData.resumeDownload.docxUrl)
    .replace('<!-- RESUME_MD_URL -->', projectData.resumeDownload.mdUrl);

  // Minify English HTML
  indexEnHtml = await minify(indexEnHtml, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: { level: 0 },
    minifyJS: true,
  });
  logger.log('✓ English HTML processed\n');

  // PHASE 2: Extract CSP hashes from MINIFIED HTML BEFORE ESCAPE
  // CRITICAL: Must extract hashes BEFORE escape, as browser sees un-escaped content
  const koHashes = extractInlineHashes(indexHtml);
  const enHashes = extractInlineHashes(indexEnHtml);
  const scriptHashes = [...new Set([...koHashes.scriptHashes, ...enHashes.scriptHashes])];
  const styleHashes = [...new Set([...koHashes.styleHashes, ...enHashes.styleHashes])];
  logger.log(
    `✓ CSP hashes extracted: ${scriptHashes.length} scripts, ${styleHashes.length} styles\n`
  );

  // PHASE 3: Escape template literals for safe JavaScript embedding (AFTER hash extraction)
  // Order matters: backslash FIRST (\ -> \\), then backtick/dollar
  indexHtml = indexHtml
    .replace(ESCAPE_PATTERNS.BACKSLASH, '\\\\')
    .replace(ESCAPE_PATTERNS.BACKTICK, '\\`')
    .replace(ESCAPE_PATTERNS.DOLLAR, '\\$');

  indexEnHtml = indexEnHtml
    .replace(ESCAPE_PATTERNS.BACKSLASH, '\\\\')
    .replace(ESCAPE_PATTERNS.BACKTICK, '\\`')
    .replace(ESCAPE_PATTERNS.DOLLAR, '\\$');
  logger.log('✓ Template literals escaped\n');

  // Security headers (using imported module)
  const SECURITY_HEADERS = securityHeadersModule.generateSecurityHeaders(scriptHashes, styleHashes);

  // Get deployment timestamp from environment or use current time
  const deployedAt = process.env.DEPLOYED_AT || new Date().toISOString();

  // Worker metrics
  const metrics = {
    requests_total: 0,
    requests_success: 0,
    requests_error: 0,
    response_time_sum: 0,
    vitals_received: 0,
    worker_start_time: Date.now(),
    version: VERSION,
    deployed_at: deployedAt,
  };

  // Rate Limiting Logic (Fixed Window)
  const RATE_LIMIT_CONFIG = {
    windowSize: 60 * 1000, // 1 minute
    maxRequests: 30, // Max requests per minute per IP
  };

  // Generate worker code from extracted modules
  const preambleOpts = {
    deployedAt,
    indexHtml,
    indexEnHtml: indexEnHtml || indexHtml,
    manifestJson,
    serviceWorker,
    mainJs,
    robotsTxt,
    sitemapXml,
    ogImageBase64,
    ogImageEnBase64: ogImageEnBase64 || ogImageBase64,
    resumePdfBase64,
    securityHeadersJson: JSON.stringify(SECURITY_HEADERS, null, 2),
    metricsJson: JSON.stringify(metrics, null, 2),
    initHistogramBucketsStr: metricsModule.initHistogramBuckets.toString(),
    generateHistogramLinesStr: metricsModule.generateHistogramLines.toString(),
    generateMetricsStr: metricsModule.generateMetrics.toString(),
    logToElasticsearchStr: esLoggerModule.logToElasticsearch.toString(),
    rateLimitConfigJson: JSON.stringify(RATE_LIMIT_CONFIG),
    authHelpersStr: authModule.generateAuthHelpers(),
  };

  const workerCode = generateWorkerPreamble(preambleOpts)
    + generateFetchAndRateLimit()
    + generatePageRoutes()
    + generateAuthRoutes({ allowedEmailsJson: JSON.stringify(ALLOWED_EMAILS) })
    + generateControlRoutes()
    + generateCfStatsRoute()
    + generateStaticRoutes()
    + generateHealthRoute({ version: VERSION, deployedAt })
    + generateMetricsRoute()
    + generateVitalsRoute()
    + generateTrackRoute()
    + generateAnalyticsRoute()
    + generateMetricsPostRoute()
    + generateMetricsGetRoute()
    + generateMetricsSnapshotRoute()
    + generateSeoRoutes()
    + generate404()
    + generateErrorHandler({ version: VERSION });

  // Write worker.js
  fs.writeFileSync(path.join(__dirname, 'worker.js'), workerCode);

  const buildTime = ((Date.now() - buildStartTime) / 1000).toFixed(2);
  const workerSizeKB = (Buffer.byteLength(workerCode, 'utf-8') / 1024).toFixed(2);

  // Cloudflare Workers free tier limit is 1MB, warn at 900KB
  if (parseFloat(workerSizeKB) > 900) {
    logger.error(`❌ Worker size ${workerSizeKB}KB exceeds 900KB limit!`);
    process.exit(1);
  }

  logger.log('✅ Improved worker.js generated successfully!');
  logger.log('\n📊 Build Statistics:');
  logger.log(`   - Build time: ${buildTime}s`);
  logger.log(`   - Worker size: ${workerSizeKB} KB`);
  logger.log(`   - Script hashes: ${scriptHashes.length}`);
  logger.log(`   - Style hashes: ${styleHashes.length}`);
  logger.log(`   - Resume cards: ${projectData.resume.length}`);
  logger.log(`   - Project cards: ${projectData.projects.length}`);
  logger.log(`   - Template cache: ${TEMPLATE_CACHE.dataHash ? 'Active' : 'Empty'}`);
  logger.log(`   - Deployed at: ${deployedAt}`);
  logger.log('\n🎯 Improvements Applied:');
  logger.log('   ✓ Configuration constants extracted');
  logger.log('   ✓ JSDoc type annotations added');
  logger.log('   ✓ Link generation helper function');
  logger.log('   ✓ Template caching implemented');
  logger.log('   ✓ Hardcoded strings eliminated');
  logger.log('   ✓ Data validation with schema checking');
  logger.log('   ✓ Safe file operations with error handling');
  logger.log('   ✓ Build time measurement');
})();
