import { log } from '../sync-logger.js';

/**
 * @typedef {{
 *   field: string;
 *   from?: unknown;
 *   to?: unknown;
 * }} FieldChange
 *
 * @typedef {{
 *   career?: string[];
 *   intro?: string[];
 *   license?: string[];
 *   award?: string[];
 *   portfolio?: string[];
 *   language?: string[];
 * }} SectionIndices
 *
 * @typedef {{
 *   name: string;
 *   value: unknown;
 * }} TargetField
 *
 * @typedef {{
 *   IsSuccess?: boolean;
 *   ErrorMessage?: string;
 *   FormError?: { Message?: string };
 *   error?: string;
 *   saveResult?: unknown;
 *   [key: string]: unknown;
 * }} SaveResult
 */

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
export async function activateRequiredSections(page) {
  await page.evaluate(() => {
    const requiredSections = [
      'InputStat_CareerInputStat',
      'InputStat_LicenseInputStat',
      'InputStat_AwardInputStat',
      'InputStat_PortfolioInputStat',
      'InputStat_SchoolInputStat',
      'InputStat_LanguageInputStat',
      'InputStat_UserIntroduceInputStat',
    ];
    for (const syncId of requiredSections) {
      const btn = $(`button[data-sync_id="${syncId}"]`);
      if (btn.length && btn.text().trim() === '필드추가') {
        /** @type {JobKoreaJQuery & { click(): void }} */ (btn).click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

/**
 * @param {FieldChange[]} changes
 * @returns {void}
 */
export function logChangeSummary(changes) {
  if (changes.length > 0) {
    log(`Found ${changes.length} field change(s)`, 'diff', 'jobkorea');
    for (const change of changes.slice(0, 50)) {
      log(`${change.field}: "${change.from}" -> "${change.to}"`, 'diff', 'jobkorea');
    }
    if (changes.length > 50) {
      log(`... and ${changes.length - 50} more`, 'diff', 'jobkorea');
    }
    return;
  }

  log('No changes detected', 'info', 'jobkorea');
}

/**
 * @param {import('playwright').Page} page
 * @param {SectionIndices} sectionIndices
 * @returns {Promise<void>}
 */
async function pruneOldSectionEntries(page, sectionIndices) {
  await page.evaluate(
    /**
     * @param {{ career?: string[]; intro?: string[]; license?: string[]; award?: string[]; portfolio?: string[]; language?: string[] }} indices
     */
    (indices) => {
      const sections = [
        { prefix: 'Career', keep: new Set(indices.career) },
        { prefix: 'ResumeProfile', keep: new Set(indices.intro) },
        { prefix: 'License', keep: new Set(indices.license) },
        { prefix: 'Award', keep: new Set(indices.award) },
        { prefix: 'Portfolio', keep: new Set(indices.portfolio) },
        { prefix: 'Language', keep: new Set(indices.language) },
      ];
      for (const { prefix, keep } of sections) {
        document.querySelectorAll(`[name^="${prefix}["]`).forEach((el) => {
          const m = /** @type {HTMLInputElement} */ (el).name.match(/\[([^\]]+)\]/);
          if (m && !keep.has(m[1])) el.remove();
        });
      }
    },
    {
      career: sectionIndices.career,
      intro: sectionIndices.intro,
      license: sectionIndices.license,
      award: sectionIndices.award,
      portfolio: sectionIndices.portfolio,
      language: sectionIndices.language,
    }
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {TargetField[]} targetFields
 * @returns {Promise<void>}
 */
async function fillTargetFields(page, targetFields) {
  const fillStats = await page.evaluate(
    /**
     * @param {TargetField[]} fields
     */
    (fields) => {
      const form = document.getElementById('frm1');
      const occurrenceByName = new Map();
      let filled = 0;
      let created = 0;
      for (const { name, value } of fields) {
        const els = document.getElementsByName(name);
        const occurrence = occurrenceByName.get(name) || 0;
        occurrenceByName.set(name, occurrence + 1);

        if (els.length > occurrence) {
          /** @type {HTMLInputElement} */ (els[occurrence]).value = String(value);
          els[occurrence].dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        } else {
          const hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = name;
          hidden.value = String(value);
          /** @type {NonNullable<typeof form>} */ (form).appendChild(hidden);
          created++;
        }
      }
      return { filled, created };
    },
    targetFields
  );

  log(`Filled ${fillStats.filled} DOM fields (${fillStats.created} created)`, 'info', 'jobkorea');
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function markPartialSave(page) {
  await page.evaluate(() => {
    const el = document.getElementsByName('hdnIsCompleteSave');
    if (el.length > 0) /** @type {HTMLInputElement} */ (el[0]).value = 'False';
  });
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<SaveResult>}
 */
async function saveForm(page) {
  return page.evaluate(async () => {
    const formData = $('#frm1').serializeArray();
    const completeIdx = formData.findIndex((f) => f.name === 'hdnIsCompleteSave');
    if (completeIdx >= 0) {
      formData[completeIdx].value = 'False';
    } else {
      formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
    }

    return await new Promise(
      /** @param {(value: SaveResult) => void} resolve */
      (resolve) => {
        $.post(`/User/Resume/Save?_=${Date.now()}`, formData, (result) => {
          resolve(/** @type {SaveResult} */ (result?.saveResult || result));
        }).fail((xhr) => {
          resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
        });
      }
    );
  });
}

/**
 * @param {SaveResult} saveResult
 * @returns {string}
 */
function buildSaveError(saveResult) {
  return (
    saveResult?.ErrorMessage ||
    saveResult?.FormError?.Message ||
    saveResult?.error ||
    'Unknown save error'
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {TargetField[]} targetFields
 * @param {SectionIndices} sectionIndices
 * @param {(msg: string, level: string, category: string) => void} logger
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function executePlaywrightSave(page, targetFields, sectionIndices, logger) {
  await pruneOldSectionEntries(page, sectionIndices);
  await fillTargetFields(page, targetFields);
  await markPartialSave(page);

  const saveResult = await saveForm(page);
  logger(`Save response: ${JSON.stringify(saveResult).slice(0, 500)}`, 'info', 'jobkorea');

  if (saveResult?.IsSuccess === false) {
    const errorMessage = buildSaveError(saveResult);
    logger(`Save failed: ${errorMessage}`, 'error', 'jobkorea');
    return { success: false, error: errorMessage };
  }

  logger('Resume form save completed', 'success', 'jobkorea');
  return { success: true };
}

/**
 * @param {{ saveSession(cookies: unknown[]): void }} handler
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<void>}
 */
export async function persistUpdatedCookies(handler, context) {
  try {
    const allCookies = await context.cookies();
    const updatedCookies = allCookies.filter((c) => c.domain.includes('jobkorea.co.kr'));
    if (updatedCookies.length > 0) {
      handler.saveSession(updatedCookies);
    }
  } catch (error) {
    log(
      `Failed to persist refreshed JobKorea cookies: ${error instanceof Error ? error.message : String(error)}`,
      'warn',
      'jobkorea'
    );
  }
}
