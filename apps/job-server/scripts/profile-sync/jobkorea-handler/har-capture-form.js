/**
 * @typedef {{
 *   length: number,
 *   text(): string,
 *   click(): void,
 *   serializeArray(): Array<{ name: string, value: string }>
 * }} JQueryElement
 *
 * @typedef {{
 *   (selector: string): JQueryElement,
 *   post(url: string, data: unknown, callback?: (result: { saveResult?: unknown } & Record<string, unknown>) => void): { fail(cb: (xhr: { statusText?: string }) => void): void }
 * }} JQueryStatic
 *
 * @typedef {typeof globalThis & { $: JQueryStatic }} BrowserGlobal
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
    ];
    for (const syncId of requiredSections) {
      const btn = /** @type {BrowserGlobal} */ (globalThis).$?.(`button[data-sync_id="${syncId}"]`);
      if (btn?.length && btn.text().trim() === '필드추가') {
        btn.click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

/**
 * @param {import('playwright').Page} page
 * @param {Array<{ name: string, value: unknown }>} targetFields
 * @returns {Promise<{ filled: number, created: number }>}
 */
export async function fillTargetFields(page, targetFields) {
  return page.evaluate((/** @type {Array<{ name: string, value: unknown }>} */ fields) => {
    const form = document.getElementById('frm1');
    let filled = 0;
    let created = 0;
    for (const { name, value } of fields) {
      const els = document.getElementsByName(name);
      if (els.length > 0) {
        /** @type {HTMLInputElement} */ (els[0]).value = String(value);
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

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
export async function markPartialSave(page) {
  await page.evaluate(() => {
    const el = document.getElementsByName('hdnIsCompleteSave');
    if (el.length > 0) /** @type {HTMLInputElement} */ (el[0]).value = 'False';
  });
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<unknown>}
 */
export async function saveForm(page) {
  return page.evaluate(async () => {
    const formData = /** @type {BrowserGlobal} */ (globalThis).$('#frm1').serializeArray();
    const completeIdx = formData.findIndex((field) => field.name === 'hdnIsCompleteSave');
    if (completeIdx >= 0) {
      formData[completeIdx].value = 'False';
    } else {
      formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
    }

    return await new Promise((resolve) => {
      /** @type {BrowserGlobal} */ (globalThis).$.post(
        `/User/Resume/Save?_=${Date.now()}`,
        formData,
        (result) => {
          resolve(result?.saveResult || result);
        }
      ).fail((xhr) => {
        resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
      });
    });
  });
}
