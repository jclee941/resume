import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { applyPlaywrightStealth } from '../playwright-stealth.js';
import { CONFIG } from '../constants.js';
import { buildJobKoreaFormData } from '../jobkorea-sections.js';
import { getEditUrl } from './change-detection.js';
import { assertJobKoreaResumeAccess } from './session.js';
import { pickJobKoreaBrowserProfile } from '../../jobkorea-session/user-agent-pool.js';
import { redactSensitiveValue } from './har-redaction-patterns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const DEFAULT_HAR_DIR = '/tmp/opencode/jobkorea-har';

function formatTimestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function getDefaultHarOutputPath(date = new Date()) {
  return path.join(DEFAULT_HAR_DIR, `jobkorea-profile-sync-${formatTimestampForFile(date)}.har`);
}

export function assertSafeHarOutputPath(outputPath) {
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('HAR output path is required');
  }

  const resolvedPath = path.resolve(outputPath);
  const resolvedRepo = path.resolve(REPO_ROOT);
  if (isPathInside(resolvedRepo, resolvedPath)) {
    throw new Error(`Refusing to write raw JobKorea HAR inside repository: ${resolvedPath}`);
  }

  if (!isPathInside(path.resolve(os.tmpdir()), resolvedPath)) {
    throw new Error(`Refusing to write raw JobKorea HAR outside ${os.tmpdir()}: ${resolvedPath}`);
  }

  return resolvedPath;
}

function redactHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, redactSensitiveValue(key, value)])
  );
}

function summarizeRequest(request) {
  const url = new URL(request.url());
  return {
    method: request.method(),
    origin: url.origin,
    path: url.pathname,
    resourceType: request.resourceType(),
    headers: redactHeaders(request.headers()),
  };
}

async function activateRequiredSections(page) {
  await page.evaluate(() => {
    const requiredSections = [
      'InputStat_CareerInputStat',
      'InputStat_LicenseInputStat',
      'InputStat_AwardInputStat',
      'InputStat_PortfolioInputStat',
      'InputStat_SchoolInputStat',
      'InputStat_LanguageInputStat',
    ];
    for (const syncId of requiredSections) {
      const btn = globalThis.$?.(`button[data-sync_id="${syncId}"]`);
      if (btn?.length && btn.text().trim() === '필드추가') {
        btn.click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

async function fillTargetFields(page, targetFields) {
  return page.evaluate((fields) => {
    const form = document.getElementById('frm1');
    let filled = 0;
    let created = 0;
    for (const { name, value } of fields) {
      const els = document.getElementsByName(name);
      if (els.length > 0) {
        els[0].value = String(value);
        els[0].dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else if (form) {
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
}

async function markPartialSave(page) {
  await page.evaluate(() => {
    const el = document.getElementsByName('hdnIsCompleteSave');
    if (el.length > 0) el[0].value = 'False';
  });
}

async function saveForm(page) {
  return page.evaluate(async () => {
    const formData = globalThis.$('#frm1').serializeArray();
    const completeIdx = formData.findIndex((field) => field.name === 'hdnIsCompleteSave');
    if (completeIdx >= 0) {
      formData[completeIdx].value = 'False';
    } else {
      formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
    }

    return await new Promise((resolve) => {
      globalThis.$.post(`/User/Resume/Save?_=${Date.now()}`, formData, (result) => {
        resolve(result?.saveResult || result);
      }).fail((xhr) => {
        resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
      });
    });
  });
}

export async function captureJobKoreaProfileSyncHar(handler, ssot, options = {}) {
  const capturedAt = new Date().toISOString();
  const harPath = assertSafeHarOutputPath(options.output ?? getDefaultHarOutputPath(new Date(capturedAt)));
  fs.mkdirSync(path.dirname(harPath), { recursive: true, mode: 0o700 });

  const cookies = handler.loadSession();
  if (!cookies) {
    return { success: false, harPath, editUrl: null, capturedAt, requestSummary: [], error: 'No session' };
  }

  const requestSummary = [];
  const browserProfile = pickJobKoreaBrowserProfile();
  const launchBrowser = options.launchBrowser ?? chromium.launch.bind(chromium);
  const ensureResumeAccess = options.assertJobKoreaResumeAccess ?? assertJobKoreaResumeAccess;
  const browser = await launchBrowser({ headless: options.headless ?? CONFIG.HEADLESS });
  const context = await browser.newContext({
    userAgent: browserProfile.userAgent,
    viewport: browserProfile.viewport,
    locale: browserProfile.locale,
    timezoneId: browserProfile.timezoneId,
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    recordHar: {
      path: harPath,
      mode: 'full',
    },
  });

  await applyPlaywrightStealth(context);

  try {
    await context.addCookies(cookies);
    const page = await context.newPage();
    page.on('request', (request) => {
      try {
        const url = new URL(request.url());
        if (url.hostname.endsWith('jobkorea.co.kr')) {
          requestSummary.push(summarizeRequest(request));
        }
      } catch {
        // Ignore malformed or browser-internal URLs.
      }
    });

    const editUrl = getEditUrl();
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 30000 });
    await ensureResumeAccess(page, {
      headlessEnv: String(options.headless ?? CONFIG.HEADLESS),
      logger: options.logger,
    });

    await page.waitForFunction(() => typeof globalThis.$ !== 'undefined' && globalThis.$('#frm1').length > 0, {
      timeout: 15000,
    });
    await activateRequiredSections(page);

    const sectionIndices = await handler.createEntrySlots(page, ssot);
    const portfolioFileIdx = options.includePortfolio ? sectionIndices.portfolio?.[0] : undefined;
    const targetFields = buildJobKoreaFormData(ssot, { ...sectionIndices, portfolioFileIdx });

    if (options.apply || options.includeSave) {
      await fillTargetFields(page, targetFields);
      await markPartialSave(page);
    }

    let saveResult = null;
    if (options.includeSave) {
      saveResult = await saveForm(page);
    }

    return { success: true, harPath, editUrl, capturedAt, requestSummary, saveResult };
  } catch (error) {
    return {
      success: false,
      harPath,
      editUrl: (() => {
        try {
          return getEditUrl();
        } catch {
          return null;
        }
      })(),
      capturedAt,
      requestSummary,
      error: error.message,
    };
  } finally {
    await browser.close();
  }
}
