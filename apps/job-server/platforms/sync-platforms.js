#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { getResumeMasterDataPath } from '../src/shared/utils/paths.js';
import { checkStatus } from './sync-platforms/status.js';
import { syncPlatforms } from './sync-platforms/sync.js';
import { previewSync } from './sync-platforms/preview.js';

const PLATFORMS = [
  'wanted',
  'jobkorea',
  'saramin',
  'remember',
  'jumpit',
  'programmers',
  'rallit',
  'rocketpunch',
  'indeed',
  'linkedin',
];

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const platforms = args.filter((a) => PLATFORMS.includes(a));
  const targetPlatforms = platforms.length > 0 ? platforms : PLATFORMS;
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    printHelp();
    process.exit(0);
  }

  const RESUME_DATA_PATH = getResumeMasterDataPath();
  if (!existsSync(RESUME_DATA_PATH)) {
    console.error(`Error: Source not found: ${RESUME_DATA_PATH}`);
    process.exit(1);
  }

  const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));

  console.log('\n📋 Resume Platform Sync');
  console.log(`   Source: ${RESUME_DATA_PATH}`);
  console.log(`   Platforms: ${targetPlatforms.join(', ')}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  switch (command) {
    case 'status':
      await checkStatus(targetPlatforms);
      break;

    case 'sync':
      await syncPlatforms(sourceData, targetPlatforms, { dry_run: dryRun });
      break;

    case 'preview':
      await previewSync(sourceData, targetPlatforms);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Resume Platform Sync - Sync resume_data.json to job platforms

USAGE:
  npm run sync:platforms [command] [platforms...] [options]

COMMANDS:
  status    Check authentication status for platforms (default)
  sync      Sync resume data to platforms
  preview   Preview changes without applying

PLATFORMS:
  wanted      Wanted Korea (API-based)
  jobkorea    JobKorea (browser automation)
  saramin     Saramin (browser automation)
  remember    Remember (browser automation)
  jumpit      Jumpit (browser automation)
  programmers Programmers (browser automation)
  rallit      Rallit (browser automation)
  rocketpunch RocketPunch (browser automation)
  indeed      Indeed (browser automation)
  linkedin    LinkedIn (browser automation)

OPTIONS:
  --dry-run, -n   Preview changes without applying
  --help, -h      Show this help

EXAMPLES:
  npm run sync:platforms status
  npm run sync:platforms sync wanted
  npm run sync:platforms sync jobkorea remember --dry-run
  npm run sync:platforms preview
`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
