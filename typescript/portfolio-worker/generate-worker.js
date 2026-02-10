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

  // Generate worker code
  const workerCode = `// Cloudflare Worker - Auto-generated (IMPROVED VERSION)
// Generated: ${deployedAt}
// Features: Template caching, JSDoc types, link helper, constants, rate limiting

const INDEX_HTML = \`${indexHtml}\`;
const INDEX_EN_HTML = \`${indexEnHtml}\`;

const MANIFEST_JSON = \`${manifestJson}\`;
const SERVICE_WORKER = \`${serviceWorker}\`;
const MAIN_JS = \`${mainJs}\`;

// SEO files
const ROBOTS_TXT = \`${robotsTxt}\`;
const SITEMAP_XML = \`${sitemapXml}\`;
const OG_IMAGE_BASE64 = '${ogImageBase64}';
const OG_IMAGE_EN_BASE64 = '${ogImageEnBase64}';
const RESUME_PDF_BASE64 = '${resumePdfBase64}';

// Security headers
const SECURITY_HEADERS = ${JSON.stringify(SECURITY_HEADERS, null, 2)};

// Metrics
const metrics = ${JSON.stringify(metrics, null, 2)};

// Histogram bucket boundaries (Prometheus standard)
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

${metricsModule.initHistogramBuckets.toString()}

${metricsModule.generateHistogramLines.toString()}

${metricsModule.generateMetrics.toString()}

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

${esLoggerModule.logToElasticsearch.toString()}

const ipCache = new Map();
const RATE_LIMIT_CONFIG = ${JSON.stringify(RATE_LIMIT_CONFIG)};

${authModule.generateAuthHelpers()}

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

    metrics.requests_total++;

    // Apply Rate Limiting to sensitive endpoints
    if (url.pathname.startsWith('/api/') || url.pathname === '/health' || url.pathname === '/metrics') {
      const now = Date.now();
      const clientData = ipCache.get(clientIp) || { count: 0, startTime: now };

      if (now - clientData.startTime > RATE_LIMIT_CONFIG.windowSize) {
        clientData.count = 1;
        clientData.startTime = now;
      } else {
        clientData.count++;
      }

      ipCache.set(clientIp, clientData);

      if (clientData.count > RATE_LIMIT_CONFIG.maxRequests) {
        return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    try {
      // Static Assets (Fonts, etc.)
      if (url.pathname.startsWith('/assets/') && env.ASSETS) {
        const assetPath = url.pathname.replace('/assets/', '/');
        const assetUrl = new URL(assetPath, request.url);
        return env.ASSETS.fetch(new Request(assetUrl, request));
      }

       // Routing

      if (url.pathname === '/') {
        const response = new Response(INDEX_HTML, { headers: SECURITY_HEADERS });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          path: url.pathname,
          method: request.method
        }));

        return response;
      }

      // English version route
      if (url.pathname === '/en/' || url.pathname === '/en') {
        const response = new Response(INDEX_EN_HTML, { headers: SECURITY_HEADERS });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          path: url.pathname,
          method: request.method
        }));

        return response;
      }

      // ============================================================
      // AUTHENTICATION ENDPOINTS
      // ============================================================
      
      if (url.pathname === '/api/auth/google' && request.method === 'POST') {
        try {
          const body = await request.json();
          const payload = await verifyGoogleToken(body.credential);
          const email = payload.email;
          const allowedEmails = ${JSON.stringify(ALLOWED_EMAILS)};

          if (allowedEmails.length > 0 && allowedEmails.includes(email)) {
            const sessionObj = { email, expires: Date.now() + 24 * 60 * 60 * 1000 };
            const sessionJson = JSON.stringify(sessionObj);
            const payloadB64 = btoa(sessionJson);
            
            const secret = (typeof env !== 'undefined' && env.SIGNING_SECRET);
            if (!secret) {
              return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 503, headers: {'Content-Type': 'application/json'} });
            }
            const signature = await signMessage(payloadB64, secret);
            
            // Cookie format: payload.signature
            const sessionValue = \`\${payloadB64}.\${signature}\`;
            const cookieValue = \`dashboard_session=\${sessionValue}; Path=/; HttpOnly; SameSite=Strict; Secure\`;
            
            metrics.requests_success++;
            return new Response(JSON.stringify({ success: true, email }), {
              headers: { 
                'Content-Type': 'application/json',
                'Set-Cookie': cookieValue
              }
            });
          } else {
            return new Response(JSON.stringify({ error: "Unauthorized email" }), { status: 403, headers: {'Content-Type': 'application/json'} });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }
      }

      if (url.pathname === '/api/auth/status') {
        const session = await verifySession(request, env);
        metrics.requests_success++;
        return new Response(JSON.stringify({ 
          authenticated: !!session, 
          user: session ? session.email : null 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // AUTOMATION CONTROL ENDPOINT (REMOTE CONTROL)
      // ============================================================

      if (url.pathname === '/api/ai/run-system' && request.method === 'POST') {
        const session = await verifySession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }

        try {
          const body = await request.json();
          const webhookBase = (typeof env !== 'undefined' && env.N8N_WEBHOOK_BASE) || "https://n8n.jclee.me/webhook";
          // Forward command to N8N Webhook (The Real Engine)
          const n8nResponse = await fetch(\`\${webhookBase}/auto-apply-trigger\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              user: session.email,
              source: 'dashboard-worker' 
            })
          });

          if (n8nResponse.ok) {
             metrics.requests_success++;
             return new Response(JSON.stringify({ success: true, message: "Automation triggered via N8N" }), {
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            throw new Error(\`N8N Error: \${n8nResponse.status}\`);
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
        }
      }

      // ============================================================
      // CLOUDFLARE ANALYTICS ENDPOINT
      // ============================================================

      if (url.pathname === '/api/cf/stats') {
        const session = await verifySession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }

        // Use env vars from Cloudflare Worker runtime (Security: Do not inject build-time secrets)
        const cfApiKey = (typeof env !== 'undefined' && env.CF_API_KEY) || "";
        const cfEmail = (typeof env !== 'undefined' && env.CF_EMAIL) || "";

        const zoneId = await getCFZoneId(cfApiKey, cfEmail);
        if (!zoneId) {
          return new Response(JSON.stringify({ error: "Zone not found" }), { status: 404, headers: {'Content-Type': 'application/json'} });
        }

        const stats = await getCFStats(zoneId, cfApiKey, cfEmail);
        metrics.requests_success++;
        return new Response(JSON.stringify({ stats }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/manifest.json') {
        metrics.requests_success++;
        return new Response(MANIFEST_JSON, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/json'
          }
        });
      }

      if (url.pathname === '/sw.js') {
        metrics.requests_success++;
        return new Response(SERVICE_WORKER, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/javascript',
            'Cache-Control': 'max-age=0, must-revalidate',
            'Service-Worker-Allowed': '/'
          }
        });
      }

      if (url.pathname === '/main.js') {
        metrics.requests_success++;
        return new Response(MAIN_JS, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/javascript'
          }
        });
      }

      if (url.pathname === '/health') {
        const uptime = Math.floor((Date.now() - metrics.worker_start_time) / 1000);

        const bindings = { d1: { healthy: false }, kv: { healthy: false } };
        try {
          const d1Start = Date.now();
          await env.DB.prepare('SELECT 1 AS ok').first();
          bindings.d1 = { healthy: true, latency_ms: Date.now() - d1Start };
        } catch (e) {
          bindings.d1 = { healthy: false, error: e.message };
        }
        try {
          const kvStart = Date.now();
          await env.SESSIONS.put('_health_check', Date.now().toString());
          await env.SESSIONS.get('_health_check');
          bindings.kv = { healthy: true, latency_ms: Date.now() - kvStart };
        } catch (e) {
          bindings.kv = { healthy: false, error: e.message };
        }

        const allHealthy = bindings.d1.healthy && bindings.kv.healthy;
        const health = {
          status: allHealthy ? 'healthy' : 'degraded',
          version: '${VERSION}',
          deployed_at: '${deployedAt}',
          uptime_seconds: uptime,
          bindings,
          metrics: {
            requests_total: metrics.requests_total,
            requests_success: metrics.requests_success,
            requests_error: metrics.requests_error,
            vitals_received: metrics.vitals_received
          }
        };

        metrics.requests_success++;
        return new Response(JSON.stringify(health, null, 2), {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

       if (url.pathname === '/metrics') {
        metrics.requests_success++;
        return new Response(generateMetrics(metrics), {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

      if (url.pathname === '/api/vitals' && request.method === 'POST') {
        try {
          const vitals = await request.json();

          // Validate vitals data structure
          const isValidNumber = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v) && v >= 0 && v < 60000; // Max 60s
          if (!vitals || typeof vitals !== 'object') {
            throw new Error('Invalid vitals object');
          }
          if (vitals.lcp !== undefined && (!isValidNumber(vitals.lcp) || vitals.lcp < 0)) {
            throw new Error('Invalid LCP value (must be >= 0)');
          }
          if (vitals.fid !== undefined && (!isValidNumber(vitals.fid) || vitals.fid < 0)) {
            throw new Error('Invalid FID value (must be >= 0)');
          }
          if (vitals.cls !== undefined && (!isValidNumber(vitals.cls) || vitals.cls < 0 || vitals.cls > 1)) {
            throw new Error('Invalid CLS value (must be 0-1)');
          }

          metrics.vitals_received++;

          ctx.waitUntil(logToElasticsearch(env, \`Web Vitals: LCP=\${vitals.lcp}ms FID=\${vitals.fid}ms CLS=\${vitals.cls}\`, 'INFO', {
            path: '/api/vitals',
            method: 'POST'
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Vitals error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }
      }

      // ============================================================
      // LINK CLICK TRACKING ENDPOINT
      // ============================================================
      if (url.pathname === '/api/track' && request.method === 'POST') {
        try {
          const trackingData = await request.json();
          
          // Validate tracking data structure
          if (!trackingData || typeof trackingData !== 'object') {
            throw new Error('Invalid tracking object');
          }
          if (!trackingData.event) {
            throw new Error('Missing event field');
          }
          
          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Track: \${trackingData.event} - \${trackingData.type || 'N/A'}\`, 'INFO', {
            path: '/api/track',
            event: trackingData.event,
            type: trackingData.type,
            language: trackingData.language,
            href: trackingData.href || ''
          }));
          
          metrics.requests_success++;
          return new Response('', { status: 204 }); // No Content (fire-and-forget)
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Tracking error: \${err.message}\`, 'ERROR'));
          return new Response('', { status: 204 }); // Still return 204 for fire-and-forget
        }
      }


      // ============================================================
      // ANALYTICS ENDPOINT (A/B Testing Data)
      // ============================================================
      if (url.pathname === '/api/analytics' && request.method === 'POST') {
        try {
          const analyticsData = await request.json();

          // Validate analytics data
          if (!analyticsData || typeof analyticsData !== 'object') {
            throw new Error('Invalid analytics object');
          }

          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Analytics: \${analyticsData.event || 'unknown'}\`, 'INFO', {
            path: '/api/analytics',
            method: 'POST',
            event: analyticsData.event,
            variant: analyticsData.variant
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Analytics error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      // ============================================================
      // METRICS ENDPOINT (Performance Metrics POST)
      // ============================================================
      if (url.pathname === '/api/metrics' && request.method === 'POST') {
        try {
          const metricsData = await request.json();

          // Validate metrics data
          if (!metricsData || typeof metricsData !== 'object') {
            throw new Error('Invalid metrics object');
          }

          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Metrics: \${JSON.stringify(metricsData).slice(0, 200)}\`, 'INFO', {
            path: '/api/metrics',
            method: 'POST'
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Metrics error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      // ============================================================
      // METRICS AGGREGATION ENDPOINT (GET) - NEW FOR PHASE 6b
      // ============================================================
      if (url.pathname === '/api/metrics' && request.method === 'GET') {
        try {
          const metricsResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            
            // HTTP Metrics
            http: {
              requests_total: metrics.requests_total,
              requests_success: metrics.requests_success,
              requests_error: metrics.requests_error,
              error_rate: metrics.requests_total > 0 
                ? (metrics.requests_error / metrics.requests_total * 100).toFixed(2) + '%'
                : '0%',
              response_time_ms: metrics.response_times.length > 0 
                ? Math.round(metrics.response_times.reduce((a, b) => a + b) / metrics.response_times.length)
                : 0
            },
            
            // Web Vitals Stats
            vitals: metrics.vitals_received > 0 ? {
              count: metrics.vitals_received,
              avg_lcp_ms: metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.lcp / metrics.vitals_received) : 0,
              avg_fid_ms: metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.fid / metrics.vitals_received) : 0,
              avg_cls: metrics.vitals_received > 0 ? (metrics.vitals_sum.cls / metrics.vitals_received).toFixed(3) : '0'
            } : null,
            
            // Tracking Events Summary
            tracking: {
              note: 'For detailed tracking data, query Loki logs with filter path=/api/track'
            }
          };
          
          ctx.waitUntil(logToElasticsearch(env, \`Metrics GET: \${metrics.requests_total} requests, \${metrics.vitals_received} vitals\`, 'INFO', {
            path: '/api/metrics',
            method: 'GET',
            requests_total: metrics.requests_total
          }));
          
          return new Response(JSON.stringify(metricsResponse), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Metrics GET error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Failed to retrieve metrics', status: 'error' }), {
            status: 500,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }


      if (url.pathname === '/api/metrics/snapshot' && request.method === 'POST') {
        try {
          const uptime = Math.floor((Date.now() - metrics.worker_start_time) / 1000);
          const errorRate = metrics.requests_total > 0
            ? (metrics.requests_error / metrics.requests_total * 100)
            : 0;
          const avgResponseTime = metrics.response_times.length > 0
            ? Math.round(metrics.response_times.reduce((a, b) => a + b) / metrics.response_times.length)
            : 0;
          const cacheHitRatio = metrics.cache_hits + metrics.cache_misses > 0
            ? (metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) * 100)
            : 0;

          const topCountries = JSON.stringify(
            Object.entries(metrics.geo_countries || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
          );
          const topColos = JSON.stringify(
            Object.entries(metrics.geo_colos || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
          );

          await env.DB.prepare(
            'INSERT INTO metrics_snapshots (total_requests, successful_requests, error_requests, avg_response_time_ms, cache_hit_ratio, web_vitals_lcp, web_vitals_inp, web_vitals_cls, web_vitals_fcp, web_vitals_ttfb, error_rate, uptime_seconds, top_countries, top_colos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            metrics.requests_total,
            metrics.requests_success,
            metrics.requests_error,
            avgResponseTime,
            cacheHitRatio,
            metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.lcp / metrics.vitals_received) : null,
            metrics.vitals_received > 0 ? Math.round((metrics.vitals_sum.fid || 0) / metrics.vitals_received) : null,
            metrics.vitals_received > 0 ? (metrics.vitals_sum.cls / metrics.vitals_received) : null,
            null,
            null,
            errorRate,
            uptime,
            topCountries,
            topColos
          ).run();

          return new Response(JSON.stringify({ status: 'ok', snapshot: 'saved' }), {
            headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
          });
        }
      }

      if (url.pathname === '/robots.txt') {
        metrics.requests_success++;
        return new Response(ROBOTS_TXT, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'text/plain'
          }
        });
      }

      if (url.pathname === '/sitemap.xml') {
        metrics.requests_success++;
        return new Response(SITEMAP_XML, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/xml'
          }
        });
      }

      if (url.pathname === '/og-image.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }

      if (url.pathname === '/og-image-en.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_EN_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }

      if (url.pathname === '/resume.pdf') {
        const pdfBuffer = Uint8Array.from(atob(RESUME_PDF_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(pdfBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="resume_jclee.pdf"',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      // 404 Not Found
      metrics.requests_error++;
      return new Response('Not Found', {
        status: 404,
        headers: {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

    } catch (err) {
      metrics.requests_error++;
      ctx.waitUntil(logToElasticsearch(env, \`Error: \${err.message}\`, 'ERROR', {
        path: url.pathname,
        method: request.method
      }));

      ctx.waitUntil((async () => {
        try {
          await env.DB.prepare(
            'INSERT INTO error_logs (message, stack, url, method, status_code, client_ip, country, colo, worker_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            err.message || 'Unknown error',
            err.stack || '',
            url.pathname,
            request.method,
            500,
            clientIp,
            request.cf?.country || '',
            request.cf?.colo || '',
            '${VERSION}'
          ).run();
        } catch {}
      })());

      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
  }
};
`;

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
