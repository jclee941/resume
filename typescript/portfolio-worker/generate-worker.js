const fs = require('fs');
const path = require('path');

const { runWorkerBuild } = require('./lib/build-orchestrator');
const logger = require('./logger');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

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
  });

  await runWorkerBuild({
    baseDir: __dirname,
    version: VERSION,
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
