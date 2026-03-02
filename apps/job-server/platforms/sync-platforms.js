#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getResumeMasterDataPath } from '../src/shared/utils/paths.js';

const PLATFORMS = ['wanted', 'jobkorea', 'remember'];

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
  wanted    Wanted Korea (API-based)
  jobkorea  JobKorea (browser automation)
  remember  Remember (browser automation)

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

async function checkStatus(platforms) {
  console.log('🔍 Checking platform status...\n');

  for (const platform of platforms) {
    process.stdout.write(`   ${platform}: `);

    try {
      const status = await getPlatformStatus(platform);
      if (status.authenticated) {
        console.log('✅ Authenticated');
        if (status.resumes) {
          status.resumes.forEach((r) => console.log(`      └─ Resume: ${r.title || r.id}`));
        }
      } else {
        console.log(`❌ Not authenticated (${status.error || status.note || 'unknown'})`);
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
  }
}

async function getPlatformStatus(platform) {
  switch (platform) {
    case 'wanted': {
      const { SessionManager } = await import('../src/tools/auth.js');
      const api = await SessionManager.getAPI();
      if (!api) return { authenticated: false, error: 'No session' };

      try {
        const resumes = await api.getResumeList();
        return {
          authenticated: true,
          resumes: resumes.resumes?.map((r) => ({ id: r.id, title: r.title })) || [],
        };
      } catch (e) {
        return { authenticated: false, error: e.message };
      }
    }

    case 'jobkorea':
    case 'remember': {
      const sessionPath = join(homedir(), `.OpenCode/data/${platform}-session.json`);
      const hasSession = existsSync(sessionPath);
      return {
        authenticated: hasSession,
        note: hasSession
          ? 'Session file exists (may be expired)'
          : 'No session, browser login required',
      };
    }

    default:
      return { authenticated: false, error: 'Unknown platform' };
  }
}

async function syncPlatforms(sourceData, platforms, options) {
  console.log(`🚀 Syncing to platforms${options.dry_run ? ' (DRY RUN)' : ''}...\n`);

  for (const platform of platforms) {
    console.log(`\n📤 ${platform.toUpperCase()}`);
    console.log('   ─────────────────');

    try {
      const result = await syncToPlatform(sourceData, platform, options);

      if (result.error) {
        console.log(`   ❌ ${result.error}`);
        if (result.hint) console.log(`   💡 ${result.hint}`);
      } else if (result.dry_run) {
        console.log('   📋 Would update:');
        console.log(
          `      ${JSON.stringify(result.would_update || result.would_sync, null, 2).replace(/\n/g, '\n      ')}`
        );
      } else {
        if (result.updated?.length > 0) {
          console.log(`   ✅ Updated: ${result.updated.join(', ')}`);
        }
        if (result.errors?.length > 0) {
          result.errors.forEach((e) => console.log(`   ⚠️  ${e.section}: ${e.error}`));
        }
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  console.log('\n✨ Sync complete\n');
}

async function syncToPlatform(sourceData, platform, options) {
  switch (platform) {
    case 'wanted': {
      const { SessionManager } = await import('../src/tools/auth.js');
      const api = SessionManager.getAPI();
      if (!api) return { error: 'Not authenticated. Run: wanted_auth first' };

      if (options.dry_run) {
        return {
          dry_run: true,
          would_update: {
            headline: `${sourceData.current.position} | ${sourceData.summary.totalExperience}`,
            careers: sourceData.careers.length,
            skills:
              (sourceData.skills.security?.items || sourceData.skills.security || []).length +
              (sourceData.skills.cloud?.items || sourceData.skills.cloud || []).length,
          },
        };
      }

      const results = { updated: [], errors: [] };
      try {
        await api.updateProfile({
          headline: `${sourceData.current.position} | ${sourceData.summary.totalExperience}`,
          description: sourceData.summary.expertise.join(', '),
        });
        results.updated.push('profile');
      } catch (e) {
        results.errors.push({ section: 'profile', error: e.message });
      }
      return results;
    }

    case 'jobkorea': {
      const { syncToJobKorea } = await import('./jobkorea/jobkorea-profile-sync.js');
      return await syncToJobKorea({ ...options, headless: false });
    }

    case 'remember': {
      const { syncToRemember } = await import('./remember/remember-profile-sync.js');
      return await syncToRemember({ ...options, headless: false });
    }

    default:
      return { error: 'Unknown platform' };
  }
}

async function previewSync(sourceData, platforms) {
  console.log('👀 Preview mode - showing what would be synced:\n');

  for (const platform of platforms) {
    console.log(`\n📋 ${platform.toUpperCase()}`);
    console.log('   ─────────────────');

    const mapped = mapToPlatform(sourceData, platform);
    console.log(`   ${JSON.stringify(mapped, null, 2).replace(/\n/g, '\n   ')}`);
  }
}

function mapToPlatform(source, platform) {
  switch (platform) {
    case 'wanted':
      return {
        headline: `${source.current.position} | ${source.summary.totalExperience}`,
        careers: source.careers.map((c) => `${c.company} - ${c.role}`),
        skills: source.summary.expertise,
      };

    case 'jobkorea':
      return {
        name: source.personal.name,
        careers: source.careers.map((c) => `${c.company} (${c.period})`),
        certifications: source.certifications.map((c) => c.name),
      };

    case 'remember':
      return {
        headline: `${source.current.position} @ ${source.current.company}`,
        experience: source.summary.totalExperience,
        skills: source.summary.expertise,
      };

    default:
      return {};
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
