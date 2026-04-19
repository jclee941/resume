import { chromium } from 'playwright';
import { CONFIG } from '../constants.js';
import { log } from '../utils.js';
import {
  buildJobKoreaFormData,
  registerPortfolioUrl,
  mapPortfolioToFormFields,
} from '../jobkorea-sections.js';
import { getEditUrl } from './change-detection.js';

const USER_AGENT_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function pickRandomUserAgent() {
  return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];
}

async function activateRequiredSections(page) {
  await page.evaluate(() => {
    const requiredSections = [
      'InputStat_CareerInputStat',
      'InputStat_LicenseInputStat',
      'InputStat_AwardInputStat',
      'InputStat_PortfolioInputStat',
    ];
    for (const syncId of requiredSections) {
      const btn = $(`button[data-sync_id="${syncId}"]`);
      if (btn.length && btn.text().trim() === '필드추가') {
        btn.click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

async function appendPortfolioFields(page, ssot, targetFields) {
  const portfolioUrl = ssot?.personal?.portfolio;
  if (!portfolioUrl) {
    return;
  }

  const fileIdx = await registerPortfolioUrl(page, portfolioUrl);
  if (fileIdx) {
    log(`Portfolio URL registered: IDX=${fileIdx}`, 'info', 'jobkorea');
    targetFields.push(...mapPortfolioToFormFields(ssot, fileIdx));
    return;
  }

  log('Portfolio URL registration failed', 'warn', 'jobkorea');
}

function logChangeSummary(changes) {
  if (changes.length > 0) {
    log(`Found ${changes.length} field change(s)`, 'diff', 'jobkorea');
    for (const change of changes.slice(0, 20)) {
      log(`${change.field}: "${change.from}" -> "${change.to}"`, 'diff', 'jobkorea');
    }
    if (changes.length > 20) {
      log(`... and ${changes.length - 20} more`, 'diff', 'jobkorea');
    }
    return;
  }

  log('No changes detected', 'info', 'jobkorea');
}

async function pruneOldSectionEntries(page, sectionIndices) {
  await page.evaluate(
    (indices) => {
      const sections = [
        { prefix: 'Career', keep: new Set(indices.career) },
        { prefix: 'License', keep: new Set(indices.license) },
        { prefix: 'Award', keep: new Set(indices.award) },
        { prefix: 'Portfolio', keep: new Set(indices.portfolio) },
      ];
      for (const { prefix, keep } of sections) {
        document.querySelectorAll(`[name^="${prefix}["]`).forEach((el) => {
          const m = el.name.match(/\[([^\]]+)\]/);
          if (m && !keep.has(m[1])) el.remove();
        });
      }
    },
    {
      career: sectionIndices.career,
      license: sectionIndices.license,
      award: sectionIndices.award,
      portfolio: sectionIndices.portfolio,
    }
  );
}

async function fillTargetFields(page, targetFields) {
  const fillStats = await page.evaluate((fields) => {
    const form = document.getElementById('frm1');
    let filled = 0;
    let created = 0;
    for (const { name, value } of fields) {
      const els = document.getElementsByName(name);
      if (els.length > 0) {
        els[0].value = String(value);
        els[0].dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = name;
        hidden.value = String(value);
        form.appendChild(hidden);
        created++;
      }
    }
    return { filled, created };
  }, targetFields);

  log(`Filled ${fillStats.filled} DOM fields (${fillStats.created} created)`, 'info', 'jobkorea');
}

async function markPartialSave(page) {
  await page.evaluate(() => {
    const el = document.getElementsByName('hdnIsCompleteSave');
    if (el.length > 0) el[0].value = 'False';
  });
}

async function saveForm(page) {
  return page.evaluate(async () => {
    const formData = $('#frm1').serializeArray();
    const completeIdx = formData.findIndex((f) => f.name === 'hdnIsCompleteSave');
    if (completeIdx >= 0) {
      formData[completeIdx].value = 'False';
    } else {
      formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
    }

    return await new Promise((resolve) => {
      $.post(`/User/Resume/Save?_=${Date.now()}`, formData, (result) => {
        resolve(result?.saveResult || result);
      }).fail((xhr) => {
        resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
      });
    });
  });
}

function buildSaveError(saveResult) {
  return (
    saveResult?.ErrorMessage ||
    saveResult?.FormError?.Message ||
    saveResult?.error ||
    'Unknown save error'
  );
}

async function persistUpdatedCookies(handler, context) {
  try {
    const allCookies = await context.cookies();
    const updatedCookies = allCookies.filter((c) => c.domain.includes('jobkorea.co.kr'));
    if (updatedCookies.length > 0) {
      handler.saveSession(updatedCookies);
    }
  } catch {
    // Context may already be closed on error paths.
  }
}

export async function syncJobKoreaProfile(handler, ssot) {
  log('Starting sync for JobKorea (via form POST)', 'info', 'jobkorea');

  const cookies = handler.loadSession();
  if (!cookies) {
    log('No saved session - login to JobKorea first and save cookies', 'error', 'jobkorea');
    return { success: false, changes: [] };
  }

  const browser = await chromium.launch({ headless: CONFIG.HEADLESS });
  const context = await browser.newContext({
    userAgent: pickRandomUserAgent(),
    viewport: { width: 1280, height: 800 },
  });

  try {
    await context.addCookies(cookies);
    const page = await context.newPage();

    const editUrl = getEditUrl();
    log(`Navigating to ${editUrl}`, 'info', 'jobkorea');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (page.url().includes('/Login')) {
      log('Session expired - redirected to login page', 'error', 'jobkorea');
      return { success: false, changes: [], error: 'Session expired' };
    }

    await page.waitForFunction(() => typeof $ !== 'undefined' && $('#frm1').length > 0, {
      timeout: 15000,
    });

    await activateRequiredSections(page);

    const sectionIndices = await handler.createEntrySlots(page, ssot);
    log(
      `Entry slots — Career: ${sectionIndices.career.length} (${sectionIndices.career.join(',')}), ` +
        `License: ${sectionIndices.license.length} (${sectionIndices.license.join(',')}), ` +
        `Award: ${sectionIndices.award.length} (${sectionIndices.award.join(',')}), ` +
        `School: ${sectionIndices.school}`,
      'info',
      'jobkorea'
    );

    const targetFields = buildJobKoreaFormData(ssot, sectionIndices);
    await appendPortfolioFields(page, ssot, targetFields);

    const currentFields = await page.evaluate(() => $('#frm1').serializeArray());
    const changes = handler.computeChanges(currentFields, targetFields);
    logChangeSummary(changes);

    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      await pruneOldSectionEntries(page, sectionIndices);
      await fillTargetFields(page, targetFields);
      await markPartialSave(page);

      const saveResult = await saveForm(page);
      log(`Save response: ${JSON.stringify(saveResult).slice(0, 500)}`, 'info', 'jobkorea');

      if (saveResult?.IsSuccess === false) {
        const errorMessage = buildSaveError(saveResult);
        log(`Save failed: ${errorMessage}`, 'error', 'jobkorea');
        return { success: false, changes, error: errorMessage };
      }

      log('Resume form save completed', 'success', 'jobkorea');
    }

    const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY;
    return { success: true, changes, dryRun };
  } catch (error) {
    log(`Sync failed: ${error.message}`, 'error', 'jobkorea');
    return { success: false, changes: [], error: error.message };
  } finally {
    await persistUpdatedCookies(handler, context);
    await browser.close();
  }
}
