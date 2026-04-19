import { log } from '../utils.js';

export async function readJobKoreaSectionIndices(page, prefix) {
  return page.evaluate((pfx) => {
    const indices = [];
    const escaped = pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    $('#frm1')
      .serializeArray()
      .forEach((f) => {
        const m = f.name.match(new RegExp(`^${escaped}\\[([^\\]]+)\\]\\.Index_Name$`));
        if (m && !indices.includes(m[1])) indices.push(m[1]);
      });
    return indices;
  }, prefix);
}

export async function createJobKoreaEntrySlots(handler, page, ssot) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  const validCerts = (Array.isArray(ssot?.certifications) ? ssot.certifications : []).filter(
    (c) => c?.date
  );
  const awardItems = Array.isArray(ssot?.awards) ? ssot.awards : [];
  const sections = [
    { prefix: 'Career', needed: careers.length },
    { prefix: 'License', needed: validCerts.length },
    { prefix: 'Award', needed: awardItems.length },
    { prefix: 'Portfolio', needed: ssot?.personal?.portfolio ? 1 : 0 },
  ];

  const existingIndices = {};

  for (const { prefix, needed } of sections) {
    if (needed <= 0) continue;

    try {
      await page.waitForFunction(
        (pfx) => {
          return $('#frm1')
            .serializeArray()
            .some((f) => f.name.startsWith(`${pfx}[`));
        },
        prefix,
        { timeout: 5000 }
      );
    } catch {
      log(`Section ${prefix} not found in form after activation`, 'warn', 'jobkorea');
      continue;
    }

    existingIndices[prefix] = new Set(await handler.readSectionIndices(page, prefix));

    let addedCount = 0;
    while (addedCount < needed) {
      const prevTotal = (await handler.readSectionIndices(page, prefix)).length;

      const clicked = await page.evaluate((pfx) => {
        const sectionLabels = {
          Career: '경력',
          License: '자격증',
          Award: '수상',
          Portfolio: '포트폴리오',
        };
        const label = sectionLabels[pfx];
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
            `Timeout: ${prefix} stuck at ${addedCount}/${needed} added entries`,
            'warn',
            'jobkorea'
          );
          break;
        }
      }

      addedCount++;
    }
  }

  const allCareerIndices = await handler.readSectionIndices(page, 'Career');
  const allLicenseIndices = await handler.readSectionIndices(page, 'License');
  const allAwardIndices = await handler.readSectionIndices(page, 'Award');
  const schoolIndices = await handler.readSectionIndices(page, 'UnivSchool');
  const allPortfolioIndices = await handler.readSectionIndices(page, 'Portfolio');

  const filterExisting = (all, prefix) => {
    const existing = existingIndices[prefix];
    if (!existing || existing.size === 0) return all;
    return all.filter((idx) => !existing.has(idx));
  };

  return {
    career: filterExisting(allCareerIndices, 'Career'),
    license: filterExisting(allLicenseIndices, 'License'),
    award: filterExisting(allAwardIndices, 'Award'),
    portfolio: filterExisting(allPortfolioIndices, 'Portfolio'),
    school: schoolIndices[0] || 'c1',
  };
}
