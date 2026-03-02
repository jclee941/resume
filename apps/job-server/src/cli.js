#!/usr/bin/env node
/**
 * Wanted Resume CLI
 * Command-line interface for resume sync pipeline operations
 *
 * Usage:
 *   node src/cli.js export <resume_id>
 *   node src/cli.js import <resume_id> [--dry-run]
 *   node src/cli.js diff <resume_id>
 *   node src/cli.js sync <resume_id> [--dry-run]
 *   node src/cli.js pipeline run <resume_id>
 *   node src/cli.js pipeline status
 */

import { SessionManager } from './tools/auth.js';
import resumeSyncTool from './tools/resume-sync.js';
import optimizeResumeTool from './tools/optimize-resume.js';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.claude', 'data', 'wanted-resume');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function printUsage() {
  console.log(`
${colors.cyan}Wanted Resume CLI${colors.reset}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${colors.yellow}Usage:${colors.reset}
  node src/cli.js <command> [options]

${colors.yellow}Commands:${colors.reset}
  ${colors.green}export${colors.reset} <resume_id>           Export resume to JSON file
  ${colors.green}import${colors.reset} <resume_id> [--dry-run]  Import resume from JSON file
  ${colors.green}diff${colors.reset} <resume_id>             Compare local vs remote resume
  ${colors.green}sync${colors.reset} <resume_id> [--dry-run]   Sync local changes to remote
  ${colors.green}optimize${colors.reset} <job_id>               Generate optimized resume for job
  ${colors.green}pipeline run${colors.reset} <resume_id>      Run full update pipeline
  ${colors.green}pipeline status${colors.reset}              Check pipeline status
  ${colors.green}list${colors.reset}                         List available resume files

${colors.yellow}Section Sync:${colors.reset}
  ${colors.green}sync:careers${colors.reset} <resume_id>      Sync only careers
  ${colors.green}sync:educations${colors.reset} <resume_id>   Sync only educations
  ${colors.green}sync:skills${colors.reset} <resume_id>       Sync only skills
  ${colors.green}sync:activities${colors.reset} <resume_id>   Sync only activities

${colors.yellow}Options:${colors.reset}
  --dry-run                      Preview changes without applying
  --file <path>                  Custom file path for import/export

${colors.yellow}Examples:${colors.reset}
  node src/cli.js export AwcICwcLBAFIAgcDCwUAB01F
  node src/cli.js diff AwcICwcLBAFIAgcDCwUAB01F
  node src/cli.js sync AwcICwcLBAFIAgcDCwUAB01F --dry-run
  node src/cli.js pipeline run AwcICwcLBAFIAgcDCwUAB01F

${colors.dim}Data directory: ${DATA_DIR}${colors.reset}
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  // Check session
  const api = await SessionManager.getAPI();
  if (!api) {
    log('❌ Not logged in. Run wanted_auth first.', 'red');
    log('   Hint: Set cookies via MCP tool', 'dim');
    process.exit(1);
  }

  const command = args[0];
  const resumeId = args[1];
  const dryRun = args.includes('--dry-run');
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;

  log(`\n${colors.cyan}━━━ Wanted Resume CLI ━━━${colors.reset}\n`);

  try {
    let result;

    switch (command) {
      case 'export':
        if (!resumeId) {
          log('❌ resume_id is required', 'red');
          process.exit(1);
        }
        log(`📤 Exporting resume ${resumeId}...`, 'blue');
        result = await resumeSyncTool.execute({
          action: 'export',
          resume_id: resumeId,
          file_path: filePath,
        });
        break;

      case 'import':
        if (!resumeId) {
          log('❌ resume_id is required', 'red');
          process.exit(1);
        }
        log(`📥 Importing resume ${resumeId}${dryRun ? ' (dry run)' : ''}...`, 'blue');
        result = await resumeSyncTool.execute({
          action: 'import',
          resume_id: resumeId,
          file_path: filePath,
          dry_run: dryRun,
        });
        break;

      case 'diff':
        if (!resumeId) {
          log('❌ resume_id is required', 'red');
          process.exit(1);
        }
        log(`🔍 Comparing resume ${resumeId}...`, 'blue');
        result = await resumeSyncTool.execute({
          action: 'diff',
          resume_id: resumeId,
          file_path: filePath,
        });
        break;

      case 'sync':
        if (!resumeId) {
          log('❌ resume_id is required', 'red');
          process.exit(1);
        }
        log(`🔄 Syncing resume ${resumeId}${dryRun ? ' (dry run)' : ''}...`, 'blue');
        result = await resumeSyncTool.execute({
          action: 'sync',
          resume_id: resumeId,
          file_path: filePath,
          dry_run: dryRun,
        });
        break;

      case 'optimize':
        const jobId = args[1];
        if (!jobId) {
          log('❌ job_id is required', 'red');
          process.exit(1);
        }
        log(`✨ Optimizing resume for job ${jobId}...`, 'blue');
        result = await optimizeResumeTool.execute({
          job_id: parseInt(jobId, 10),
        });
        break;

      case 'sync:careers':
      case 'sync:educations':
      case 'sync:skills':
      case 'sync:activities':
      case 'sync:language_certs':
        if (!resumeId) {
          log('❌ resume_id is required', 'red');
          process.exit(1);
        }
        const section = command.split(':')[1];
        log(`🔄 Syncing ${section} for ${resumeId}${dryRun ? ' (dry run)' : ''}...`, 'blue');
        result = await resumeSyncTool.execute({
          action: `sync_${section}`,
          resume_id: resumeId,
          dry_run: dryRun,
        });
        break;

      case 'pipeline':
        const subCommand = args[1];
        const pipelineResumeId = args[2];

        if (subCommand === 'run') {
          if (!pipelineResumeId) {
            log('❌ resume_id is required for pipeline run', 'red');
            process.exit(1);
          }
          log(`🚀 Running pipeline for ${pipelineResumeId}...`, 'blue');
          result = await resumeSyncTool.execute({
            action: 'pipeline_run',
            resume_id: pipelineResumeId,
            dry_run: dryRun,
          });
        } else if (subCommand === 'status') {
          log('📊 Checking pipeline status...', 'blue');
          result = await resumeSyncTool.execute({
            action: 'pipeline_status',
          });
        } else {
          log('❌ Unknown pipeline command. Use: run, status', 'red');
          process.exit(1);
        }
        break;

      case 'list':
        log('📁 Resume files:', 'blue');
        try {
          const { readdirSync } = await import('fs');
          const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
          if (files.length === 0) {
            log('   No resume files found. Run export first.', 'dim');
          } else {
            files.forEach((f) => log(`   • ${f}`, 'green'));
          }
        } catch {
          log('   Data directory not found. Run export first.', 'dim');
        }
        process.exit(0);

      default:
        log(`❌ Unknown command: ${command}`, 'red');
        printUsage();
        process.exit(1);
    }

    // Print result
    if (result.success) {
      log('\n✅ Success!', 'green');
      console.log(JSON.stringify(result, null, 2));
    } else {
      log(`\n❌ Error: ${result.error}`, 'red');
      if (result.hint) {
        log(`   Hint: ${result.hint}`, 'dim');
      }
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
