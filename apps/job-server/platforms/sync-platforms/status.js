import { existsSync } from 'fs';
import { join } from 'path';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';

export async function checkStatus(platforms) {
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

export async function getPlatformStatus(platform) {
  switch (platform) {
    case 'wanted': {
      const { SessionManager } = await import('../../src/shared/services/session/index.js');
      let api = await SessionManager.getAPI();
      if (!api) {
        const renewed = await autoRenewWantedSession();
        if (renewed) api = await SessionManager.getAPI();
      }
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
    case 'saramin':
    case 'remember':
    case 'jumpit':
    case 'programmers':
    case 'rallit':
    case 'rocketpunch':
    case 'indeed':
    case 'linkedin': {
      const sessionPath = join(getResumeBasePath(), `${platform}-session.json`);
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

export async function autoRenewWantedSession() {
  const email = process.env.WANTED_EMAIL;
  const password = process.env.WANTED_PASSWORD;
  if (!email || !password) {
    console.log('   WANTED_EMAIL/WANTED_PASSWORD not set, skipping auto-renew');
    return false;
  }
  try {
    console.log('   Auto-renewing Wanted session...');
    const { renewWantedSession } = await import('../../scripts/renew-wanted-session.js');
    await renewWantedSession(email, password);
    return true;
  } catch (e) {
    console.log('   Auto-renew failed:', e.message);
    return false;
  }
}
