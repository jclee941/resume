#!/usr/bin/env node
/**
 * Profile Sync Script - SSOT to Job Platforms
 *
 * Syncs resume_data.json (Single Source of Truth) to external job platforms:
 * - Wanted (wanted.co.kr) - Uses WantedAPI (no browser automation needed)
 * - JobKorea (jobkorea.co.kr) - Browser-based sync
 * - Saramin (saramin.co.kr) - Browser-based sync
 *
 * Usage:
 *   node profile-sync.js                    # Sync all platforms (dry-run)
 *   node profile-sync.js --apply            # Actually apply changes
 *   node profile-sync.js wanted --apply     # Sync specific platform
 *   node profile-sync.js --diff             # Show diff only
 *
 * Requires:
 *   - Active sessions for each platform (run auth-persistent.js first)
 *   - resume_data.json in packages/data/resumes/master/
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WantedAPI from '../src/shared/clients/wanted/index.js';
import WantedClient from '@resume/shared/wanted-client';
import {
  syncWantedSkills,
  syncWantedCareers,
  syncWantedEducations,
  syncWantedActivities,
  syncWantedAbout,
  syncWantedContactInfo,
} from './profile-sync/wanted-sections.js';
import JobKoreaHandler from './profile-sync/jobkorea-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  SSOT_PATH: path.resolve(__dirname, '../../../packages/data/resumes/master/resume_data.json'),
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.resolve(__dirname, '../../..'),
  HEADLESS: process.argv.includes('--headless'),
  APPLY: process.argv.includes('--apply'),
  DIFF_ONLY: process.argv.includes('--diff'),
};

const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    profileUrl: 'https://www.wanted.co.kr/cv/list',
    editUrl: 'https://www.wanted.co.kr/cv/edit',
    selectors: {
      name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      headline: 'textarea[name="introduction"]',
      skills: '[data-testid="skills-section"]',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      introduction: ssot.summary.profileStatement,
    }),
  },
  jobkorea: {
    name: 'JobKorea',
    profileUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    editUrl: 'https://www.jobkorea.co.kr/User/Resume/RegResume',
    selectors: {
      name: '#userName',
      email: '#userEmail',
      phone: '#userPhone',
      headline: '#selfIntroduce',
      skills: '.skill-tag-area',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current?.position || ssot.careers?.[0]?.role || ''} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
  saramin: {
    name: 'Saramin',
    profileUrl: 'https://www.saramin.co.kr/zf_user/member/info',
    editUrl: 'https://www.saramin.co.kr/zf_user/resume/write',
    selectors: {
      name: '#name',
      email: '#email',
      phone: '#phone',
      headline: '#selfIntro',
      skills: '.skill-list',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current?.position || ssot.careers?.[0]?.role || ''} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
};

function log(msg, type = 'info', platform = null) {
  const prefix =
    { info: 'INFO', success: 'OK', warn: 'WARN', error: 'ERR', diff: 'DIFF' }[type] || 'LOG';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} [${prefix}] ${tag} ${msg}`);
}

function loadSSOT() {
  if (!fs.existsSync(CONFIG.SSOT_PATH)) {
    throw new Error(`SSOT not found: ${CONFIG.SSOT_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.SSOT_PATH, 'utf-8'));
  log(`Loaded SSOT: ${data.personal.name}`, 'success');
  return data;
}

async function getCurrentProfile(page, platform) {
  const config = PLATFORMS[platform];
  const profile = {};

  try {
    await page.goto(config.profileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Check if logged in
    const url = page.url();
    if (url.includes('login') || url.includes('auth')) {
      log('Not logged in - session expired', 'error', platform);
      return null;
    }

    // Extract current values based on platform
    if (platform === 'wanted') {
      // Wanted uses SNS API - fetch from profile page
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('[class*="ProfileName"]');
        const headlineEl = document.querySelector('[class*="Introduction"]');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: headlineEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    } else if (platform === 'jobkorea') {
      // JobKorea profile extraction
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('.user-name, .resume-name');
        const titleEl = document.querySelector('.resume-title, .self-intro');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: titleEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    } else if (platform === 'saramin') {
      // Saramin profile extraction
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('.user_name, .name');
        const titleEl = document.querySelector('.intro_txt, .self-intro');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: titleEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    }

    log(`Current profile: ${JSON.stringify(profile)}`, 'info', platform);
    return profile;
  } catch (error) {
    log(`Failed to get profile: ${error.message}`, 'error', platform);
    return null;
  }
}

function computeDiff(current, target) {
  const changes = [];
  for (const [key, targetValue] of Object.entries(target)) {
    const currentValue = current[key];
    if (currentValue !== targetValue) {
      changes.push({
        field: key,
        from: currentValue || '(empty)',
        to: targetValue,
      });
    }
  }
  return changes;
}

async function applyChanges(page, platform, changes) {
  if (changes.length === 0) {
    log('No changes to apply', 'success', platform);
    return true;
  }

  const config = PLATFORMS[platform];

  try {
    // Navigate to edit page
    await page.goto(config.editUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    for (const change of changes) {
      log(`Applying: ${change.field} = ${change.to}`, 'info', platform);

      const selector = config.selectors[change.field];
      if (!selector) {
        log(`No selector for field: ${change.field}`, 'warn', platform);
        continue;
      }

      const element = await page.$(selector);
      if (!element) {
        log(`Element not found: ${selector}`, 'warn', platform);
        continue;
      }

      // Clear and fill
      await element.click({ clickCount: 3 });
      await element.fill(change.to);
      await page.waitForTimeout(500);
    }

    // Look for save button
    const saveButton = await page.$(
      'button[type="submit"], .btn-save, .save-btn, [data-testid="save"]'
    );
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(3000);
      log('Changes saved', 'success', platform);
    } else {
      log('Save button not found - changes may not be saved', 'warn', platform);
    }

    return true;
  } catch (error) {
    log(`Failed to apply changes: ${error.message}`, 'error', platform);
    return false;
  }
}

function tryLoadSessionFile(sessionPath) {
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  try {
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    if (!session.cookies && !session.cookieString) {
      return null;
    }
    // Handle both string format (from auth-sync.js) and array format (legacy)
    if (typeof session.cookies === 'string') {
      return session.cookies.length > 0 ? session.cookies : null;
    }
    if (Array.isArray(session.cookies) && session.cookies.length > 0) {
      return session.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }
    // Fallback to cookieString (normalized by SessionManager.save)
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

function loadWantedSession() {
  // Try platform-specific session file first
  const sessionPath = path.join(CONFIG.SESSION_DIR, 'wanted-session.json');
  const cookies = tryLoadSessionFile(sessionPath);
  if (cookies) return cookies;

  // Fallback: check unified sessions.json (written by SessionManager)
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

async function syncWantedViaAPI(ssot) {
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

    // Profile updates (require --apply, no internal dry-run)
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

    // Resume syncs - these have internal dry-run logic, so run in both modes
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

async function syncPlatformViaBrowser(platformKey, ssot) {
  const config = PLATFORMS[platformKey];

  const userDataDir = path.join(CONFIG.USER_DATA_DIR, platformKey);
  if (!fs.existsSync(userDataDir)) {
    log(`No saved session - run auth-persistent.js ${platformKey} first`, 'error', platformKey);
    return { success: false, changes: [] };
  }

  log(`Starting sync for ${config.name}`, 'info', platformKey);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: CONFIG.HEADLESS,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = browser.pages()[0] || (await browser.newPage());

  try {
    const current = await getCurrentProfile(page, platformKey);
    if (!current) {
      await browser.close();
      return { success: false, changes: [] };
    }

    const target = config.mapData(ssot);
    const changes = computeDiff(current, target);

    if (changes.length === 0) {
      log('Profile is up to date', 'success', platformKey);
      await browser.close();
      return { success: true, changes: [] };
    }

    log(`Found ${changes.length} change(s):`, 'diff', platformKey);
    for (const change of changes) {
      console.log(`  ${change.field}: "${change.from}" -> "${change.to}"`);
    }

    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      const applied = await applyChanges(page, platformKey, changes);
      await browser.close();
      return { success: applied, changes };
    }

    await browser.close();
    return { success: true, changes, dryRun: true };
  } catch (error) {
    log(`Sync failed: ${error.message}`, 'error', platformKey);
    await browser.close();
    return { success: false, changes: [], error: error.message };
  }
}

async function syncPlatform(platformKey, ssot) {
  const config = PLATFORMS[platformKey];
  if (!config) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return { success: false, changes: [] };
  }

  if (platformKey === 'wanted') {
    return syncWantedViaAPI(ssot);
  }

  if (platformKey === 'jobkorea') {
    const handler = new JobKoreaHandler();
    return handler.sync(ssot);
  }

  return syncPlatformViaBrowser(platformKey, ssot);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Profile Sync - SSOT to Job Platforms');
  console.log('='.repeat(60));

  // Parse args
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetPlatforms = args.length > 0 ? args : Object.keys(PLATFORMS);

  log(`Mode: ${CONFIG.APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`Platforms: ${targetPlatforms.join(', ')}`);
  log(`Headless: ${CONFIG.HEADLESS}`);
  console.log('-'.repeat(60));

  // Load SSOT
  const ssot = loadSSOT();

  // Sync each platform
  const results = {};
  for (const platform of targetPlatforms) {
    if (!PLATFORMS[platform]) {
      log(`Skipping unknown platform: ${platform}`, 'warn');
      continue;
    }

    console.log(`\n${'='.repeat(40)}`);
    results[platform] = await syncPlatform(platform, ssot);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const [platform, result] of Object.entries(results)) {
    const status = result.success ? 'OK' : 'FAIL';
    const changes = result.changes?.length || 0;
    const mode = result.dryRun ? '(dry-run)' : '';
    console.log(`  ${platform.padEnd(12)} ${status.padEnd(6)} ${changes} changes ${mode}`);
  }

  if (!CONFIG.APPLY) {
    console.log('\nRun with --apply to actually update profiles');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
