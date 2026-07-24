import { execSync } from 'child_process';
import { autoRenewWantedSession } from './status.js';

export async function syncPlatforms(sourceData, platforms, options) {
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

export async function syncToPlatform(sourceData, platform, options) {
  switch (platform) {
    case 'wanted': {
      const { SessionManager } = await import('../../src/shared/services/session/index.js');
      let api = await SessionManager.getAPI();
      if (!api) {
        const renewed = await autoRenewWantedSession();
        if (renewed) api = await SessionManager.getAPI();
      }
      if (!api) return { error: 'Not authenticated. Auto-renew failed or no credentials.' };

      if (options.dry_run) {
        return {
          dry_run: true,
          would_update: {
            headline: `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} | ${sourceData.summary.totalExperience}`,
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
          headline: `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} | ${sourceData.summary.totalExperience}`,
          description: sourceData.summary.expertise.join(', '),
        });
        results.updated.push('profile');
      } catch (e) {
        results.errors.push({ section: 'profile', error: e.message });
      }
      return results;
    }

    case 'jobkorea': {
      try {
        const flags = options.dry_run ? '' : '--apply';
        const output = execSync(`node scripts/profile-sync/index.js jobkorea ${flags}`, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 120000,
        });
        const hasError = output.includes('ERROR') || output.includes('Failed');
        return hasError
          ? { error: 'Sync encountered errors', details: output }
          : { updated: ['profile'], output };
      } catch (e) {
        return { error: `JobKorea sync failed: ${e.message}` };
      }
    }

    case 'saramin': {
      const { syncToSaramin } = await import('../../src/tools/platforms/saramin-sync.js');
      return await syncToSaramin(sourceData, options);
    }

    case 'remember': {
      const { syncToRemember } = await import('../remember/remember-profile-sync.js');
      return await syncToRemember({ ...options, headless: false });
    }

    case 'jumpit': {
      const { syncToJumpit } = await import('../../src/tools/platforms/jumpit-sync.js');
      return await syncToJumpit(sourceData, options);
    }

    case 'programmers': {
      const { syncToProgrammers } = await import('../../src/tools/platforms/programmers-sync.js');
      return await syncToProgrammers(sourceData, options);
    }

    case 'rallit': {
      const { syncToRallit } = await import('../../src/tools/platforms/rallit-sync.js');
      return await syncToRallit(sourceData, options);
    }

    case 'rocketpunch': {
      const { syncToRocketPunch } = await import('../../src/tools/platforms/rocketpunch-sync.js');
      return await syncToRocketPunch(sourceData, options);
    }

    case 'indeed': {
      const { syncToIndeed } = await import('../../src/tools/platforms/indeed-sync.js');
      return await syncToIndeed(sourceData, options);
    }

    case 'linkedin': {
      const { syncToLinkedIn } = await import('../../src/tools/platforms/linkedin-sync.js');
      return await syncToLinkedIn(sourceData, options);
    }

    default:
      return { error: 'Unknown platform' };
  }
}
