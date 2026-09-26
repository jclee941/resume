import { log } from '../sync-logger.js';

/**
 * @typedef {{ readSectionIndices(page: import('playwright').Page, prefix: string): Promise<string[]> }} SectionIndexReader
 * @typedef {(handler: SectionIndexReader, page: import('playwright').Page, prefix: string, needed: number, options?: { force?: boolean }) => Promise<void>} AddSlotsFn
 */

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
async function deleteExistingCareerEntries(page) {
  return page.evaluate(() => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const careerNames = $('#frm1')
      .serializeArray()
      .filter((f) => /^Career\[[^\]]+\]\.C_Name$/.test(f.name));
    let deleted = 0;

    try {
      for (const field of careerNames) {
        const input = document.getElementsByName(field.name)[0];
        const container = input?.closest('.container');
        const deleteButton = container?.querySelector(
          'button.buttonDeleteField, button.buttonDelete'
        );
        if (!deleteButton) continue;
        /** @type {HTMLElement} */ (deleteButton).click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
async function deleteExistingIntroEntries(page) {
  return page.evaluate(() => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const introHeaders = $('#frm1')
      .serializeArray()
      .filter((f) => /^ResumeProfile\[[^\]]+\]\.Header$/.test(f.name));
    let deleted = 0;

    try {
      for (const field of introHeaders) {
        const input = document.getElementsByName(field.name)[0];
        const container = input?.closest('.container');
        const deleteButton = container?.querySelector(
          'button.buttonDeleteField, button.buttonDelete'
        );
        if (!deleteButton) continue;
        /** @type {HTMLElement} */ (deleteButton).click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<number>}
 */
async function deleteExistingLicenseEntries(page) {
  return page.evaluate(() => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const licenseNames = $('#frm1')
      .serializeArray()
      .filter((f) => /^License\[[^\]]+\]\.Lc_Name$/.test(f.name));
    let deleted = 0;

    try {
      for (const field of licenseNames) {
        const input = document.getElementsByName(field.name)[0];
        const container = input?.closest('.container');
        const deleteButton = container?.querySelector(
          'button.buttonDeleteField, button.buttonDelete'
        );
        if (!deleteButton) continue;
        /** @type {HTMLElement} */ (deleteButton).click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

/**
 * @param {SectionIndexReader} handler
 * @param {import('playwright').Page} page
 * @param {number} needed
 * @param {AddSlotsFn} addSlots
 * @returns {Promise<void>}
 */
export async function recreateCareerEntries(handler, page, needed, addSlots) {
  if (needed <= 0) return;

  const deleted = await deleteExistingCareerEntries(page);
  if (deleted > 0) {
    log(
      `Deleted ${deleted} existing Career entr${deleted === 1 ? 'y' : 'ies'} before rebuild`,
      'info',
      'jobkorea'
    );
  }

  if (deleted === 0) {
    await page.waitForFunction(
      () => {
        return !$('#frm1')
          .serializeArray()
          .some((f) => /^Career\[[^\]]+\]/.test(f.name));
      },
      null,
      { timeout: 5000 }
    );
  }

  await addSlots(handler, page, 'Career', needed, { force: true });
}

/**
 * @param {SectionIndexReader} handler
 * @param {import('playwright').Page} page
 * @param {number} needed
 * @param {AddSlotsFn} addSlots
 * @returns {Promise<void>}
 */
export async function recreateIntroEntries(handler, page, needed, addSlots) {
  if (needed <= 0) return;

  const deleted = await deleteExistingIntroEntries(page);
  if (deleted > 0) {
    log(
      `Deleted ${deleted} existing intro entr${deleted === 1 ? 'y' : 'ies'} before rebuild`,
      'info',
      'jobkorea'
    );
  }

  try {
    await page.waitForFunction(
      () => {
        return !$('#frm1')
          .serializeArray()
          .some((f) => /^ResumeProfile\[[^\]]+\]/.test(f.name));
      },
      null,
      { timeout: 5000 }
    );
  } catch {
    log(
      'Timed out waiting for stale intro rows to disappear; forcing fresh intro slot',
      'warn',
      'jobkorea'
    );
  }

  await addSlots(handler, page, 'ResumeProfile', needed, { force: true });
}

/**
 * @param {SectionIndexReader} handler
 * @param {import('playwright').Page} page
 * @param {number} needed
 * @param {AddSlotsFn} addSlots
 * @returns {Promise<void>}
 */
export async function recreateLicenseEntries(handler, page, needed, addSlots) {
  if (needed <= 0) return;

  const deleted = await deleteExistingLicenseEntries(page);
  if (deleted > 0) {
    log(
      `Deleted ${deleted} existing License entr${deleted === 1 ? 'y' : 'ies'} before rebuild`,
      'info',
      'jobkorea'
    );
  }

  await addSlots(handler, page, 'License', needed, { force: true });
}
