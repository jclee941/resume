import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { CONFIG, PLATFORMS } from './config.js';
import { computeDiff, log } from './common.js';

export async function getCurrentProfile(page, platform) {
  const config = PLATFORMS[platform];
  const profile = {};

  try {
    await page.goto(config.profileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('login') || url.includes('auth')) {
      log('Not logged in - session expired', 'error', platform);
      return null;
    }

    if (platform === 'wanted') {
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

export async function applyChanges(page, platform, changes) {
  if (changes.length === 0) {
    log('No changes to apply', 'success', platform);
    return true;
  }

  const config = PLATFORMS[platform];

  try {
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

      await element.click({ clickCount: 3 });
      await element.fill(change.to);
      await page.waitForTimeout(500);
    }

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

export async function syncPlatformViaBrowser(platformKey, ssot) {
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
