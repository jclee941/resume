import fs from 'fs';
import path from 'path';
import WantedAPI from '../../src/shared/clients/wanted/index.js';
import WantedClient from '@resume/shared/wanted-client';
import {
  syncWantedSkills,
  syncWantedCareers,
  syncWantedEducations,
  syncWantedActivities,
  syncWantedAbout,
  syncWantedContactInfo,
} from '../profile-sync/wanted-sections.js';
import { CONFIG, PLATFORMS } from './config.js';
import { computeDiff, log } from './common.js';

export function tryLoadSessionFile(sessionPath) {
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  try {
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    if (!session.cookies && !session.cookieString) {
      return null;
    }
    if (typeof session.cookies === 'string') {
      return session.cookies.length > 0 ? session.cookies : null;
    }
    if (Array.isArray(session.cookies) && session.cookies.length > 0) {
      return session.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }
    if (
      session.cookieString &&
      typeof session.cookieString === 'string' &&
      session.cookieString.length > 0
    ) {
      return session.cookieString;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadWantedSession() {
  const sessionPath = path.join(CONFIG.SESSION_DIR, 'wanted-session.json');
  const cookies = tryLoadSessionFile(sessionPath);
  if (cookies) return cookies;

  const unifiedPath = path.join(CONFIG.SESSION_DIR, 'sessions.json');
  if (fs.existsSync(unifiedPath)) {
    try {
      const sessions = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
      const wanted = sessions.wanted;
      if (wanted?.cookieString) return wanted.cookieString;
      if (wanted?.cookies && typeof wanted.cookies === 'string') return wanted.cookies;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

export async function syncWantedViaAPI(ssot) {
  log('Starting sync for Wanted (via API)', 'info', 'wanted');

  const cookieString = loadWantedSession();
  if (!cookieString) {
    log('No saved session - run auth-persistent.js wanted first', 'error', 'wanted');
    return { success: false, changes: [] };
  }

  try {
    const api = new WantedAPI(cookieString);

    const profile = await api.getSnsProfile();
    if (!profile || !profile.user?.name) {
      log('Failed to get profile - session may be expired', 'error', 'wanted');
      return { success: false, changes: [] };
    }

    const current = {
      name: profile.user?.name || '',
      introduction: profile.user?.description || '',
    };

    const target = PLATFORMS.wanted.mapData(ssot);
    const changes = computeDiff(current, target);

    if (changes.length > 0) {
      log(`Found ${changes.length} profile change(s):`, 'diff', 'wanted');
      for (const change of changes) {
        console.log(`  ${change.field}: "${change.from}" -> "${change.to}"`);
      }
    }

    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      const updateData = {};
      for (const change of changes) {
        if (change.field === 'introduction') {
          updateData.description = change.to;
        } else if (change.field === 'name') {
          updateData.name = change.to;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await api.updateProfile(updateData);
        log('Profile updated via API', 'success', 'wanted');
      }
    }

    const resumes = await api.getResumeList();
    const resumeId = resumes?.[0]?.key;

    if (resumeId) {
      const client = new WantedClient(cookieString);

      try {
        const skillsResult = await syncWantedSkills(api, ssot, profile);
        if (skillsResult.changes > 0) {
          changes.push({
            field: 'skills',
            from: `${skillsResult.deleted} skills`,
            to: `+${skillsResult.added} skills`,
          });
        }
      } catch (e) {
        log(`Skills sync failed: ${e.message}`, 'error', 'wanted');
      }

      try {
        const careersResult = await syncWantedCareers(client, ssot, profile, resumeId);
        if (careersResult.added > 0 || careersResult.updated > 0) {
          changes.push({
            field: 'careers',
            from: `${careersResult.updated} updated`,
            to: `+${careersResult.added} added`,
          });
        }
      } catch (e) {
        log(`Careers sync failed: ${e.message}`, 'error', 'wanted');
      }

      try {
        const educationsResult = await syncWantedEducations(client, ssot, profile, resumeId);
        if (educationsResult.added > 0 || educationsResult.updated > 0) {
          changes.push({
            field: 'educations',
            from: `${educationsResult.updated} updated`,
            to: `+${educationsResult.added} added`,
          });
        }
      } catch (e) {
        log(`Education sync failed: ${e.message}`, 'error', 'wanted');
      }

      try {
        const activitiesResult = await syncWantedActivities(client, ssot, profile, resumeId);
        if (activitiesResult.added > 0 || activitiesResult.updated > 0) {
          changes.push({
            field: 'activities',
            from: `${activitiesResult.updated} updated`,
            to: `+${activitiesResult.added} added`,
          });
        }
      } catch (e) {
        log(`Activities sync failed: ${e.message}`, 'error', 'wanted');
      }

      try {
        const resumeDetail = await client.getResumeDetail(resumeId);

        const aboutResult = await syncWantedAbout(client, ssot, resumeDetail?.resume, resumeId);
        if (aboutResult.updated > 0) {
          changes.push({ field: 'about', from: 'old', to: 'updated' });
        }

        const contactResult = await syncWantedContactInfo(
          client,
          ssot,
          resumeDetail?.resume,
          resumeId
        );
        if (contactResult.updated > 0) {
          changes.push({ field: 'contact', from: 'old', to: 'updated' });
        }
      } catch (e) {
        log(`About/Contact sync failed: ${e.message}`, 'error', 'wanted');
      }
    } else {
      log('No resumeId found - skipping career/education/activity sync', 'warn', 'wanted');
    }

    const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY;
    return { success: true, changes, dryRun };
  } catch (error) {
    log(`Sync failed: ${error.message}`, 'error', 'wanted');
    return { success: false, changes: [], error: error.message };
  }
}
