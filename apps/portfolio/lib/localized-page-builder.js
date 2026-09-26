const {
  buildJapaneseTemplate,
  buildLocalizedHtml,
  escapeForTemplateLiteral,
} = require('./html-transformer');
const { buildHeroContent } = require('./hero-content');

/**
 * @typedef {Object} PortfolioPageOptions
 * @property {string} indexHtmlRaw
 * @property {string} indexEnHtmlRaw
 * @property {string} cssContent
 * @property {Record<string, string>} templates
 * @property {string} version
 * @property {string} buildDeployedAt
 * @property {string} buildDeployedDate
 *
 * @typedef {{ indexHtml: string, indexEnHtml: string, indexJaHtml: string }} PortfolioPages
 */

/** @param {PortfolioPageOptions} options */
function sharedPageOptions({ cssContent, templates, version, buildDeployedAt, buildDeployedDate }) {
  return {
    cssContent,
    buildVersion: version,
    buildDeployedAt,
    buildDeployedDate,
    contactGridHtml: templates.contactGridHtml,
  };
}

/**
 * @param {Record<string, string>} templates
 * @param {'ko' | 'en' | 'ja'} locale
 */
function contentOptions(templates, locale) {
  const suffix = locale === 'ko' ? '' : locale[0].toUpperCase() + locale.slice(1);
  return {
    resumeCardsHtml: templates[`resumeCards${suffix}Html`],
    projectCardsHtml: templates[`projectCards${suffix}Html`],
    projectSchemasHtml: localizeProjectSchemas(templates[`projectSchemas${suffix}Html`], locale),
    infrastructureCardsHtml: templates[`infrastructureCards${suffix}Html`],
    skillsHtml: templates[`skills${suffix}Html`],
    certCardsHtml: templates[`certCards${suffix}Html`],
    aboutContentHtml: templates[`aboutContent${suffix}Html`],
    profileBentoHtml: templates[`profileBento${suffix}Html`],
    achievementsHtml: templates[`achievements${suffix}Html`],
    expertiseHtml: templates[`expertise${suffix}Html`],
    coverLetterHtml: templates[`coverLetter${suffix}Html`],
  };
}

/**
 * @param {string | undefined} html
 * @param {string} locale
 * @returns {string}
 */
function localizeProjectSchemas(html, locale) {
  if (!html) return '';

  if (locale === 'en') {
    return html.replace(
      /"creator":\{"@type":"Person","name":"이재철","alternateName":"Jaecheol Lee"\}/g,
      '"creator":{"@type":"Person","name":"Jaecheol Lee","alternateName":"이재철"}'
    );
  }
  if (locale === 'ja') {
    return html
      .replace(
        /"creator":\{"@type":"Person","name":"이재철","alternateName":"Jaecheol Lee"\}/g,
        '"creator":{"@type":"Person","name":"イ・ジェチョル","alternateName":"Jaecheol Lee"}'
      )
      .replace(
        /"isPartOf":\{"@type":"WebSite","name":"Jaecheol Lee Resume"/g,
        '"isPartOf":{"@type":"WebSite","name":"イ・ジェチョル Resume"'
      );
  }
  return html;
}

/**
 * @param {PortfolioPageOptions} options
 * @returns {Promise<PortfolioPages>}
 */
async function buildPortfolioPages(options) {
  const { indexHtmlRaw, indexEnHtmlRaw } = options;
  const shared = sharedPageOptions(options);

  const indexHtml = await buildLocalizedHtml(indexHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'ko'),
    heroContentHtml: buildHeroContent('ko'),
  });
  const indexEnHtml = await buildLocalizedHtml(indexEnHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'en'),
    heroContentHtml: buildHeroContent('en'),
  });
  const indexJaHtml = await buildLocalizedHtml(buildJapaneseTemplate(indexHtmlRaw), {
    ...shared,
    ...contentOptions(options.templates, 'ja'),
    heroContentHtml: buildHeroContent('ja'),
  });

  return { indexHtml, indexEnHtml, indexJaHtml };
}

/**
 * @param {PortfolioPages} pages
 * @param {Parameters<typeof escapeForTemplateLiteral>[1]} escapePatterns
 * @returns {PortfolioPages}
 */
function escapePortfolioPages(pages, escapePatterns) {
  return {
    indexHtml: escapeForTemplateLiteral(pages.indexHtml, escapePatterns),
    indexEnHtml: escapeForTemplateLiteral(pages.indexEnHtml, escapePatterns),
    indexJaHtml: escapeForTemplateLiteral(pages.indexJaHtml, escapePatterns),
  };
}

module.exports = { buildPortfolioPages, escapePortfolioPages };
