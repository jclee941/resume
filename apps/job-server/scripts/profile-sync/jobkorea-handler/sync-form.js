import { log } from '../sync-logger.js';

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
        btn.click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

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

async function pruneOldSectionEntries(page, sectionIndices) {
  await page.evaluate(
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
          const m = el.name.match(/\[([^\]]+)\]/);
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

async function fillTargetFields(page, targetFields) {
  const fillStats = await page.evaluate((fields) => {
    const form = document.getElementById('frm1');
    const occurrenceByName = new Map();
    let filled = 0;
    let created = 0;
    for (const { name, value } of fields) {
      const els = document.getElementsByName(name);
      const occurrence = occurrenceByName.get(name) || 0;
      occurrenceByName.set(name, occurrence + 1);

      if (els.length > occurrence) {
        els[occurrence].value = String(value);
        els[occurrence].dispatchEvent(new Event('change', { bubbles: true }));
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

export async function persistUpdatedCookies(handler, context) {
  try {
    const allCookies = await context.cookies();
    const updatedCookies = allCookies.filter((c) => c.domain.includes('jobkorea.co.kr'));
    if (updatedCookies.length > 0) {
      handler.saveSession(updatedCookies);
    }
  } catch (error) {
    log(`Failed to persist refreshed JobKorea cookies: ${error.message}`, 'warn', 'jobkorea');
  }
}
