const fs = require('fs');
const path = require('path');

const { runWorkerBuild } = require('./lib/build-orchestrator');
const logger = require('./logger');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

// Build-time git SHA for post-deploy code-reflection verification.
// Priority: explicit env (GIT_SHA, GITHUB_SHA, CF_PAGES_COMMIT_SHA,
// WORKERS_CI_COMMIT_SHA), then `git rev-parse HEAD`, then 'unknown'.
function resolveGitSha() {
  const envSha =
    process.env.GIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA;
  if (envSha) return envSha.trim();
  try {
    return require('child_process')
      .execSync('git rev-parse HEAD', {
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
  } catch {
    return 'unknown';
  }
}
const GIT_SHA = resolveGitSha();

const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(',').map((email) => email.trim())
  : [];
const _GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const _N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.jclee.me/webhook';

(async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  logger.log('🚀 Starting improved worker generation...\n');
  logger.debug('Build configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    DEBUG: process.env.DEBUG,
    VERBOSE: process.env.VERBOSE,
    VERSION,
    GIT_SHA,
  });

  await runWorkerBuild({
    baseDir: __dirname,
    version: VERSION,
    gitSha: GIT_SHA,
    allowedEmails: ALLOWED_EMAILS,
    logger,
  });

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
