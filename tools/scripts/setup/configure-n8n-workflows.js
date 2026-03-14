#!/usr/bin/env node

/**
 * n8n Workflow Configuration Script
 *
 * Applies user configuration to n8n workflow templates, replacing placeholders
 * with actual values from config.json.
 *
 * Usage:
 *   node scripts/setup/configure-n8n-workflows.js
 *   node scripts/setup/configure-n8n-workflows.js --config path/to/config.json
 *   node scripts/setup/configure-n8n-workflows.js --validate-only
 *
 * Workflow:
 *   1. Load config.json (or specified config file)
 *   2. Validate configuration against JSON schema
 *   3. Read workflow template files
 *   4. Replace placeholders with config values
 *   5. Write configured workflows to output directory
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG_PATH = path.join(
  __dirname,
  '..',
  'infrastructure',
  'workflows',
  'config.json'
);
// Schema path for future validation implementation
// const CONFIG_SCHEMA_PATH = path.join(__dirname, '..', 'infrastructure', 'workflows', 'config.template.json');
const WORKFLOWS_DIR = path.join(__dirname, '..', 'infrastructure', 'workflows');
const OUTPUT_DIR = path.join(
  __dirname,
  '..',
  'infrastructure',
  'workflows',
  'configured'
);

const WORKFLOW_TEMPLATES = [
  '01-site-health-monitor.json',
  '02-github-deployment-webhook.json',
];

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const args = process.argv.slice(2);
const options = {
  configPath: DEFAULT_CONFIG_PATH,
  validateOnly: false,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--config':
      options.configPath = args[++i];
      break;
    case '--validate-only':
      options.validateOnly = true;
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--help':
    case '-h':
      printHelp();
      process.exit(0);
    default:
      console.error(`Unknown option: ${args[i]}`);
      printHelp();
      process.exit(1);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function printHelp() {
  console.log(`
n8n Workflow Configuration Script

Usage: node scripts/setup/configure-n8n-workflows.js [options]

Options:
  --config <path>       Path to config.json (default: infrastructure/workflows/config.json)
  --validate-only       Only validate config, don't generate workflows
  --verbose, -v         Enable verbose output
  --help, -h            Show this help message

Examples:
  # Configure workflows with default config.json
  node scripts/setup/configure-n8n-workflows.js

  # Use custom config file
  node scripts/setup/configure-n8n-workflows.js --config my-config.json

  # Validate config without generating workflows
  node scripts/setup/configure-n8n-workflows.js --validate-only

Output:
  Configured workflows are written to: infrastructure/workflows/configured/
  `);
}

function log(message, level = 'info') {
  const prefix =
    {
      info: '✓',
      warn: '⚠',
      error: '✗',
      verbose: '→',
    }[level] || 'ℹ';

  if (level === 'verbose' && !options.verbose) return;

  console.log(`${prefix} ${message}`);
}

function validateConfig(config) {
  const errors = [];

  // Validate required top-level keys
  const requiredKeys = ['evolution_api', 'google_sheets', 'monitoring'];
  for (const key of requiredKeys) {
    if (!config[key]) {
      errors.push(`Missing required configuration: ${key}`);
    }
  }

  // Validate Evolution API configuration
  if (config.evolution_api) {
    if (!config.evolution_api.api_url || !config.evolution_api.api_url.startsWith('https://')) {
      errors.push('Invalid evolution_api.api_url (expected HTTPS URL)');
    }
    if (!config.evolution_api.api_key || config.evolution_api.api_key.length < 1) {
      errors.push('Missing evolution_api.api_key');
    }
    if (!config.evolution_api.instance_name || !/^[a-zA-Z0-9_-]+$/.test(config.evolution_api.instance_name)) {
      errors.push('Invalid evolution_api.instance_name (expected alphanumeric with hyphens/underscores)');
    }
    if (!config.evolution_api.whatsapp_number || !/^[0-9]{10,15}$/.test(config.evolution_api.whatsapp_number)) {
      errors.push('Invalid evolution_api.whatsapp_number (expected 10-15 digit phone number)');
    }
  }

  // Validate Google Sheets configuration
  if (config.google_sheets) {
    if (
      !config.google_sheets.spreadsheet_id ||
      config.google_sheets.spreadsheet_id.length !== 44
    ) {
      errors.push(
        'Invalid Google Sheets spreadsheet_id (expected 44 characters)'
      );
    }
    if (
      config.google_sheets.spreadsheet_id === 'GOOGLE_SHEET_ID_HERE_44_CHARS'
    ) {
      errors.push(
        'Google Sheets spreadsheet_id not configured (still using placeholder)'
      );
    }
  }

  // Validate monitoring configuration
  if (config.monitoring) {
    if (
      !config.monitoring.health_endpoint ||
      !config.monitoring.health_endpoint.startsWith('https://')
    ) {
      errors.push('Invalid monitoring.health_endpoint (expected HTTPS URL)');
    }
  }

  return errors;
}

function applyConfiguration(workflowContent, config) {
  let content = workflowContent;

  // Replace Evolution API placeholders
  content = content.replace(
    /EVOLUTION_API_URL_PLACEHOLDER/g,
    config.evolution_api.api_url
  );
  content = content.replace(
    /EVOLUTION_INSTANCE_PLACEHOLDER/g,
    config.evolution_api.instance_name
  );
  content = content.replace(
    /EVOLUTION_WHATSAPP_PLACEHOLDER/g,
    config.evolution_api.whatsapp_number
  );

  // Replace Google Sheets IDs
  content = content.replace(
    /GOOGLE_SHEET_ID/g,
    config.google_sheets.spreadsheet_id
  );
  content = content.replace(
    /"Resume Monitoring"/g,
    `"${config.google_sheets.spreadsheet_name}"`
  );

  // Replace monitoring URLs
  content = content.replace(
    /https:\/\/resume\.jclee\.me\/health/g,
    config.monitoring.health_endpoint
  );
  content = content.replace(
    /https:\/\/resume\.jclee\.me/g,
    config.monitoring.site_url
  );
  content = content.replace(
    /https:\/\/grafana\.jclee\.me\/d\/resume/g,
    config.monitoring.grafana_dashboard_url
  );
  content = content.replace(
    /https:\/\/loki\.jclee\.me\/loki\/api\/v1\/push/g,
    config.monitoring.loki_url
  );

  // Replace monitoring intervals and timeouts
  content = content.replace(
    /"expression": "\*\/5 \* \* \* \*"/g,
    `"expression": "${config.monitoring.health_check_interval}"`
  );
  content = content.replace(
    /"timeout": 10000/g,
    `"timeout": ${config.monitoring.http_timeout}`
  );
  content = content.replace(
    /"maxTries": 3/g,
    `"maxTries": ${config.monitoring.http_retry_max_tries}`
  );

  // Replace webhook paths
  if (config.github) {
    content = content.replace(
      /"path": "resume-deploy"/g,
      `"path": "${config.github.webhook_path}"`
    );
  }

  return content;
}

function ensureOutputDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
    log(`Created output directory: ${OUTPUT_DIR}`, 'verbose');
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 n8n Workflow Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Load configuration
  log(`Loading configuration from: ${options.configPath}`);

  if (!fs.existsSync(options.configPath)) {
    log(`Configuration file not found: ${options.configPath}`, 'error');
    log('\nCreate config.json by copying config.example.json:', 'info');
    log(
      `  cp infrastructure/workflows/config.example.json ${options.configPath}`,
      'verbose'
    );
    log('  Then edit config.json with your values', 'verbose');
    process.exit(1);
  }

  let config;
  try {
    const configContent = fs.readFileSync(options.configPath, 'utf8');
    config = JSON.parse(configContent);
    log('Configuration loaded successfully');
  } catch (error) {
    log(`Failed to parse configuration: ${error.message}`, 'error');
    process.exit(1);
  }

  // Step 2: Validate configuration
  log('Validating configuration...');
  const validationErrors = validateConfig(config);

  if (validationErrors.length > 0) {
    log('Configuration validation failed:', 'error');
    validationErrors.forEach(error => log(`  • ${error}`, 'error'));
    process.exit(1);
  }

  log('Configuration is valid ✓');

  if (options.validateOnly) {
    console.log('\n✓ Validation complete (--validate-only mode)\n');
    process.exit(0);
  }

  // Step 3: Process workflow templates
  log('\nProcessing workflow templates...');
  ensureOutputDirectory();

  let processedCount = 0;

  for (const templateFile of WORKFLOW_TEMPLATES) {
    const templatePath = path.join(WORKFLOWS_DIR, templateFile);
    const outputPath = path.join(OUTPUT_DIR, templateFile);

    if (!fs.existsSync(templatePath)) {
      log(`Template not found: ${templateFile}`, 'warn');
      continue;
    }

    log(`Processing: ${templateFile}`, 'verbose');

    try {
      // Read template
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = JSON.parse(templateContent);

      // Apply configuration
      const configured = applyConfiguration(
        JSON.stringify(template, null, 2),
        config
      );
      const configuredWorkflow = JSON.parse(configured);

      // Write configured workflow
      fs.writeFileSync(
        outputPath,
        JSON.stringify(configuredWorkflow, null, 2),
        'utf8'
      );
      log(`✓ ${templateFile} → configured/${templateFile}`);
      processedCount++;
    } catch (error) {
      log(`Failed to process ${templateFile}: ${error.message}`, 'error');
    }
  }

  // Step 4: Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Configuration Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log(`Processed ${processedCount}/${WORKFLOW_TEMPLATES.length} workflows`);
  log(`Output directory: ${OUTPUT_DIR}`);

  console.log('\n📋 Next Steps:\n');
  console.log(
    '  1. Review configured workflows in infrastructure/workflows/configured/'
  );
  console.log('  2. Import to n8n: https://n8n.jclee.me');
  console.log('     • Workflows → Import from File');
  console.log('     • Upload each .json file from configured/');
  console.log('  3. Configure OAuth2 credentials in n8n');
  console.log('  4. Activate workflows\n');
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
