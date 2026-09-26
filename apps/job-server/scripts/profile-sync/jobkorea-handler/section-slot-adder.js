import { log } from '../sync-logger.js';

/**
 * @typedef {{
 *   force?: boolean;
 * }} AddJobKoreaEntrySlotsOptions
 */

/**
 * @param {{ readSectionIndices(page: import('playwright').Page, prefix: string): Promise<string[]> }} handler
 * @param {import('playwright').Page} page
 * @param {string} prefix
 * @param {number} needed
 * @param {AddJobKoreaEntrySlotsOptions} [options]
 * @returns {Promise<void>}
 */
export async function addJobKoreaEntrySlots(handler, page, prefix, needed, options = {}) {
  if (needed <= 0) return;

  const existingCount = options.force ? 0 : (await handler.readSectionIndices(page, prefix)).length;
  const slotsToAdd = Math.max(0, needed - existingCount);
  let addedCount = 0;

  while (addedCount < slotsToAdd) {
    const prevTotal = (await handler.readSectionIndices(page, prefix)).length;

    const clicked = await page.evaluate((pfx) => {
      const sectionLabels = {
        Career: '경력',
        ResumeProfile: '자기소개서',
        License: '자격증',
        Award: '수상',
        Portfolio: '포트폴리오',
        Skill: '스킬',
        Language: '외국어',
        Project: '개인프로젝트',
      };
      const label = /** @type {Record<string, string>} */ (sectionLabels)[pfx];
      if (!label) return false;

      const heading = $('h2')
        .filter(function () {
          return $(this).text().includes(label);
        })
        .first();
      if (!heading.length) return false;

      let section = heading.parent();
      for (let i = 0; i < 5; i++) {
        if (!section.length || section.is('form, body')) break;
        const addBtn = section.find('button.buttonAddField').filter(function () {
          return $(this).text().includes('추가');
        });
        if (addBtn.length > 0) {
          addBtn[0].click();
          return true;
        }
        section = section.parent();
      }
      return false;
    }, prefix);

    if (!clicked) {
      log(`"추가" button not found for ${prefix}`, 'warn', 'jobkorea');
      break;
    }

    try {
      await page.waitForFunction(
        /**
         * @param {{ pfx: string, prev: number }} arg
         */
        ({ pfx, prev }) => {
          const seen = new Set();
          const escaped = pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`^${escaped}\\[([^\\]]+)\\]`);
          $('#frm1')
            .serializeArray()
            .forEach((f) => {
              const m = f.name.match(re);
              if (m) seen.add(m[1]);
            });
          return seen.size > prev;
        },
        { pfx: prefix, prev: prevTotal },
        { timeout: 5000 }
      );
    } catch {
      const newTotal = (await handler.readSectionIndices(page, prefix)).length;
      if (newTotal <= prevTotal) {
        log(
          `Timeout: ${prefix} stuck at ${addedCount}/${slotsToAdd} added entries`,
          'warn',
          'jobkorea'
        );
        break;
      }
    }

    addedCount++;
  }
}
