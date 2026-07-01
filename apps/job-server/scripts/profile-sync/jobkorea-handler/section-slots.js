import { log } from '../sync-logger.js';

export async function readJobKoreaSectionIndices(page, prefix) {
  return page.evaluate((pfx) => {
    const indices = [];
    const escaped = pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    $('#frm1')
      .serializeArray()
      .forEach((f) => {
        if (pfx === 'ResumeProfile' && f.name === 'ResumeProfile.Index' && f.value) {
          if (!indices.includes(f.value)) indices.push(f.value);
          return;
        }
        const m = f.name.match(new RegExp(`^${escaped}\\[([^\\]]+)\\]\\.Index_Name$`));
        if (m && !indices.includes(m[1])) indices.push(m[1]);
      });
    return indices;
  }, prefix);
}

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
        deleteButton.click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

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
        deleteButton.click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

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
        deleteButton.click();
        deleted++;
      }
    } finally {
      window.confirm = originalConfirm;
    }

    return deleted;
  });
}

async function recreateCareerEntries(handler, page, needed) {
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

  await addJobKoreaEntrySlots(handler, page, 'Career', needed, { force: true });
}

async function recreateIntroEntries(handler, page, needed) {
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

  await addJobKoreaEntrySlots(handler, page, 'ResumeProfile', needed, { force: true });
}

async function recreateLicenseEntries(handler, page, needed) {
  if (needed <= 0) return;

  const deleted = await deleteExistingLicenseEntries(page);
  if (deleted > 0) {
    log(
      `Deleted ${deleted} existing License entr${deleted === 1 ? 'y' : 'ies'} before rebuild`,
      'info',
      'jobkorea'
    );
  }

  await addJobKoreaEntrySlots(handler, page, 'License', needed, { force: true });
}

async function addJobKoreaEntrySlots(handler, page, prefix, needed, options = {}) {
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

export async function createJobKoreaEntrySlots(handler, page, ssot, options = {}) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  const validCerts = (Array.isArray(ssot?.certifications) ? ssot.certifications : []).filter(
    (c) => c?.date
  );
  const awardItems = Array.isArray(ssot?.awards) ? ssot.awards : [];
  const languages = Array.isArray(ssot?.languages) ? ssot.languages : [];
  const introNeeded = ssot?.coverLetter?.ko?.paragraphs?.length > 0 ? 1 : 0;
  const sections = [
    { prefix: 'Career', needed: careers.length },
    { prefix: 'ResumeProfile', needed: introNeeded },
    { prefix: 'License', needed: validCerts.length },
    { prefix: 'Award', needed: awardItems.length },
    { prefix: 'Portfolio', needed: ssot?.personal?.portfolio ? 1 : 0 },
    { prefix: 'Language', needed: languages.length },
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
      if (prefix !== 'Career' && prefix !== 'ResumeProfile') {
        log(`Section ${prefix} not found in form after activation`, 'warn', 'jobkorea');
        continue;
      }
    }

    existingIndices[prefix] = new Set(await handler.readSectionIndices(page, prefix));

    if (prefix === 'Career' && options.recreateCareerEntries === true) {
      await recreateCareerEntries(handler, page, needed);
    } else if (prefix === 'ResumeProfile' && options.recreateIntroEntries === true) {
      await recreateIntroEntries(handler, page, needed);
    } else if (prefix === 'License' && options.recreateLicenseEntries === true) {
      await recreateLicenseEntries(handler, page, needed);
    } else {
      await addJobKoreaEntrySlots(handler, page, prefix, needed);
    }
  }

  const allCareerIndices = await handler.readSectionIndices(page, 'Career');
  const allIntroIndices = await handler.readSectionIndices(page, 'ResumeProfile');
  const careerIndices =
    options.recreateCareerEntries === true
      ? allCareerIndices.slice(-careers.length)
      : allCareerIndices;
  const introIndices =
    options.recreateIntroEntries === true ? allIntroIndices.slice(-introNeeded) : allIntroIndices;
  const allLicenseIndices = await handler.readSectionIndices(page, 'License');
  const allAwardIndices = await handler.readSectionIndices(page, 'Award');
  const schoolIndices = await handler.readSectionIndices(page, 'UnivSchool');
  const allPortfolioIndices = await handler.readSectionIndices(page, 'Portfolio');
  const allLanguageIndices = await handler.readSectionIndices(page, 'Language');

  return {
    career: careerIndices,
    intro: introIndices,
    license: allLicenseIndices,
    award: allAwardIndices,
    portfolio: allPortfolioIndices,
    school: schoolIndices[0] || 'c1',
    language: allLanguageIndices,
  };
}
