const {
  buildJapaneseTemplate,
  buildLocalizedHtml,
  escapeForTemplateLiteral,
} = require('./html-transformer');
const { buildHeroContent } = require('./hero-content');
const { defaultOwnerIdentity, escapeRegExp } = require('./owner-identity');

/**
 * @typedef {Object} PortfolioPageOptions
 * @property {string} indexHtmlRaw
 * @property {string} indexEnHtmlRaw
 * @property {string} cssContent
 * @property {Record<string, string>} templates
 * @property {string} version
 * @property {string} buildDeployedAt
 * @property {string} buildDeployedDate
 * @property {import('./owner-identity').OwnerIdentity} [identity]
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
 * @param {import('./owner-identity').OwnerIdentity} identity
 */
function contentOptions(templates, locale, identity) {
  const suffix = locale === 'ko' ? '' : locale[0].toUpperCase() + locale.slice(1);
  return {
    resumeCardsHtml: templates[`resumeCards${suffix}Html`],
    projectCardsHtml: templates[`projectCards${suffix}Html`],
    projectSchemasHtml: localizeProjectSchemas(
      templates[`projectSchemas${suffix}Html`],
      locale,
      identity
    ),
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
 * @param {import('./owner-identity').OwnerIdentity} identity
 * @returns {string}
 */
function localizeProjectSchemas(html, locale, identity) {
  if (!html) return '';

  /** @param {string} name @param {string} alternateName */
  const creator = (name, alternateName) =>
    `"creator":{"@type":"Person","name":${JSON.stringify(name)},"alternateName":${JSON.stringify(alternateName)}}`;
  /** @param {string} name */
  const site = (name) => `"isPartOf":{"@type":"WebSite","name":${JSON.stringify(`${name} Resume`)}`;
  /** @param {string} text */
  const literal = (text) => new RegExp(escapeRegExp(text), 'g');
  const { nameKo, nameEn, nameJa } = identity;

  if (locale === 'en') {
    return html.replace(literal(creator(nameKo, nameEn)), () => creator(nameEn, nameKo));
  }
  if (locale === 'ja') {
    return html
      .replace(literal(creator(nameKo, nameEn)), () => creator(nameJa, nameEn))
      .replace(literal(site(nameEn)), () => site(nameJa));
  }
  return html;
}

/**
 * @param {PortfolioPageOptions} options
 * @returns {Promise<PortfolioPages>}
 */
async function buildPortfolioPages(options) {
  const { indexHtmlRaw, indexEnHtmlRaw, identity = defaultOwnerIdentity() } = options;
  const shared = sharedPageOptions(options);

  const indexHtml = await buildLocalizedHtml(indexHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'ko', identity),
    heroContentHtml: buildHeroContent('ko', identity),
  });
  const indexEnHtml = await buildLocalizedHtml(indexEnHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'en', identity),
    heroContentHtml: buildHeroContent('en', identity),
  });
  const indexJaHtml = await buildLocalizedHtml(buildJapaneseTemplate(indexHtmlRaw, identity), {
    ...shared,
    ...contentOptions(options.templates, 'ja', identity),
    heroContentHtml: buildHeroContent('ja', identity),
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
