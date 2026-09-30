const fs = require('fs');
const { WEB_DATA_OVERRIDES_PATH } = require('./resume-data-paths.js');
const {
  careerCardFromSource,
  englishCareerCardFromSource,
  englishProjectCardFromSource,
  projectCardFromSource,
  timelineCareerFromSource,
} = require('./resume-web-data-projections.js');

/**
 * @typedef {Object} WebDataOverrides
 * @property {Record<string, import('./resume-web-data-projections.js').TranslationOverride>} careerEn
 * @property {Record<string, import('./resume-web-data-projections.js').TranslationOverride>} projectEn
 * @property {Record<string, string[][]>} statsByIndex
 * @property {import('./resume-web-data-projections.js').CardConfig} cardConfig
 * @property {{ excludedIds: string[], unlinkedIds: string[] }} publicPortfolio
 */

/**
 * Load the content-side display data (overrides, card stats, icons, public policy).
 * @returns {WebDataOverrides}
 */
function loadWebDataOverrides() {
  if (!fs.existsSync(WEB_DATA_OVERRIDES_PATH)) {
    throw new Error(
      `Missing resume content file: ${WEB_DATA_OVERRIDES_PATH}. ` +
        'Restore the content pack (see docs/adr/0011-content-pack-in-d1.md) before generating web data.'
    );
  }
  const { cardIcons, completePdfUrl, ...rest } = JSON.parse(
    fs.readFileSync(WEB_DATA_OVERRIDES_PATH, 'utf8')
  );
  return { ...rest, cardConfig: { icons: cardIcons, completePdfUrl } };
}

/**
 * @typedef {Object} ResumeContact
 * @property {string} [email]
 * @property {string} [github]
 * @property {string} [linkedin]
 * @property {string} [velog]
 * @property {string} [website]
 * @property {string} [monitoring]
 * @property {string} [phone]
 * @property {string} [portfolio]
 */

/**
 * @typedef {Object} ResumeSourceSummary
 * @property {unknown} [aboutSection]
 * @property {unknown} [expertise]
 * @property {unknown} [coreCompetencies]
 */

/**
 * @typedef {Object} ResumeSource
 * @property {import('./resume-web-data-projections.js').SourceCareer[]} careers
 * @property {import('./resume-web-data-projections.js').SourceProject[]} [personalProjects]
 * @property {Array<{ id?: string, [key: string]: unknown }>} [infrastructure]
 * @property {ResumeContact} [contact]
 * @property {ResumeSourceSummary | null} [summary]
 * @property {unknown} [certifications]
 * @property {unknown} [skills]
 * @property {unknown} [hero]
 * @property {unknown} [sectionDescriptions]
 * @property {unknown} [achievements]
 * @property {unknown} [education]
 * @property {unknown} [languages]
 * @property {unknown} [awards]
 * @property {unknown} [ossContributions]
 * @property {unknown} [military]
 * @property {unknown} [coverLetter]
 * @property {unknown} [platformVariants]
 */

/**
 * @template {{ id?: string }} T
 * @param {T[] | null | undefined} items
 * @param {Set<string | undefined>} excludedIds
 * @returns {T[]}
 */
function publicPortfolioItems(items, excludedIds) {
  return (items || []).filter((item) => !excludedIds.has(item.id));
}

/**
 * @param {ResumeContact | null | undefined} contact
 */
function publicContact(contact) {
  const { email, github, linkedin, velog, website, monitoring } = contact || {};
  return { email, github, linkedin, velog, website, monitoring };
}

/**
 * @param {ResumeSource} source
 * @param {string} [language]
 */
function generateWebData(source, language = 'ko') {
  const content = loadWebDataOverrides();
  const { cardConfig } = content;
  const excludedIds = new Set(content.publicPortfolio.excludedIds);
  const unlinkedIds = new Set(content.publicPortfolio.unlinkedIds);
  const statsByIndex = content.statsByIndex[language] || content.statsByIndex.ko;

  // SSoT → portfolio data contract:
  // - source.careers[] → resume[] (flat career cards: icon, title, description, period, stats, highlight)
  // - source.personalProjects[] → projects[] (showcase cards)
  // INTENTIONALLY EXCLUDED: source.careers[].projects[] (work sub-projects with techStack/achievements)
  //   These are job-application detail consumed by Wanted/JobKorea sync, not portfolio content.
  //   The terminal-themed portfolio shows summarized career cards only.
  //   If sub-projects need to render here, extend the entry below AND update apps/portfolio/lib/cards.js.
  const resume = source.careers.map((career, idx) =>
    careerCardFromSource(career, idx, statsByIndex, cardConfig)
  );
  const resumeEn = source.careers.map((career, idx) =>
    englishCareerCardFromSource(career, idx, content.statsByIndex.en, content.careerEn, cardConfig)
  );
  const publicProjects = /** @type {import('./resume-web-data-projections.js').SourceProject[]} */ (
    publicPortfolioItems(source.personalProjects, excludedIds).map((project) =>
      unlinkedIds.has(project.id) ? { ...project, githubUrl: null, repoUrl: null } : project
    )
  );
  const projects = publicProjects.map(projectCardFromSource);
  const projectsEn = publicProjects.map((project) =>
    englishProjectCardFromSource(project, content.projectEn)
  );

  // SSoT careers[] → top-level careers[] for the client timeline module.
  // Preserves the data fields apps/portfolio/src/scripts/modules/timeline.js renders
  // (company, companyUrl, period, role, myRole, description) so the timeline reads from
  // build-injected window.__RESUME_CHAT_DATA__.careers instead of a hardcoded fallback.
  // `achievements` is flattened from the SSoT work sub-projects (career.projects[].achievements)
  // so the timeline "Impact" text + expanded list stay sourced from the SSoT (no drift).
  // UI-only metadata (phase/status) is NOT part of the SSoT and is attached in timeline.js.
  const careers = source.careers.map(timelineCareerFromSource);

  return {
    resumeDownload: {
      pdfUrl: 'https://resume.jclee.me/resume.pdf',
      docxUrl:
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/archive/versions/resume_final.docx',
      mdUrl:
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/master/resume_final.md',
    },
    resume,
    careers,
    resumeEn,
    projects,
    projectsEn,
    certifications: source.certifications,
    skills: source.skills,
    hero: source.hero,
    sectionDescriptions: source.sectionDescriptions,
    achievements: source.achievements,
    infrastructure: publicPortfolioItems(source.infrastructure, excludedIds),
    contact: publicContact(source.contact),
    aboutSection:
      source.summary && source.summary.aboutSection ? source.summary.aboutSection : null,
    expertise: source.summary && source.summary.expertise ? source.summary.expertise : null,
    coreCompetencies:
      source.summary && source.summary.coreCompetencies ? source.summary.coreCompetencies : null,
    education: source.education || null,
    languages: source.languages || null,
    awards: source.awards || null,
    ossContributions: source.ossContributions || null,
    military: source.military || null,
    coverLetter: source.coverLetter || null,
    platformVariants: source.platformVariants || null,
  };
}

module.exports = {
  generateWebData,
};
