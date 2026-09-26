import { log } from '../sync-logger.js';
import { addJobKoreaEntrySlots } from './section-slot-adder.js';
import {
  recreateCareerEntries as recreateCareerEntriesImpl,
  recreateIntroEntries as recreateIntroEntriesImpl,
  recreateLicenseEntries as recreateLicenseEntriesImpl,
} from './section-slot-rebuild.js';

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

async function recreateCareerEntries(handler, page, needed, addSlots = addJobKoreaEntrySlots) {
  return recreateCareerEntriesImpl(handler, page, needed, addSlots);
}

async function recreateIntroEntries(handler, page, needed, addSlots = addJobKoreaEntrySlots) {
  return recreateIntroEntriesImpl(handler, page, needed, addSlots);
}

async function recreateLicenseEntries(handler, page, needed, addSlots = addJobKoreaEntrySlots) {
  return recreateLicenseEntriesImpl(handler, page, needed, addSlots);
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
      await recreateCareerEntries(handler, page, needed, addJobKoreaEntrySlots);
    } else if (prefix === 'ResumeProfile' && options.recreateIntroEntries === true) {
      await recreateIntroEntries(handler, page, needed, addJobKoreaEntrySlots);
    } else if (prefix === 'License' && options.recreateLicenseEntries === true) {
      await recreateLicenseEntries(handler, page, needed, addJobKoreaEntrySlots);
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
