const {
  buildJapaneseTemplate,
  buildLocalizedHtml,
  escapeForTemplateLiteral,
} = require('./html-transformer');
const { buildHeroContent } = require('./hero-content');

function toChatLiteral(data) {
  return `'${Buffer.from(JSON.stringify(data), 'utf-8').toString('base64')}'`;
}

function parseLocaleData(raw, fallback, logger) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`⚠ locale chat-data parse failed, falling back to KO: ${err.message}`);
    return fallback;
  }
}

function sharedPageOptions({ cssContent, templates, version, buildDeployedAt, buildDeployedDate }) {
  return {
    cssContent,
    buildVersion: version,
    buildDeployedAt,
    buildDeployedDate,
    contactGridHtml: templates.contactGridHtml,
  };
}

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

function localizeProjectSchemas(html, locale) {
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

async function buildPortfolioPages(options) {
  const { indexHtmlRaw, indexEnHtmlRaw, projectData, projectDataEnRaw, projectDataJaRaw, logger } =
    options;
  const shared = sharedPageOptions(options);
  const chatData = {
    ko: toChatLiteral(projectData),
    en: toChatLiteral(parseLocaleData(projectDataEnRaw, projectData, logger)),
    ja: toChatLiteral(parseLocaleData(projectDataJaRaw, projectData, logger)),
  };

  const indexHtml = await buildLocalizedHtml(indexHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'ko'),
    heroContentHtml: buildHeroContent('ko'),
    resumeChatDataBase64: chatData.ko,
  });
  const indexEnHtml = await buildLocalizedHtml(indexEnHtmlRaw, {
    ...shared,
    ...contentOptions(options.templates, 'en'),
    heroContentHtml: buildHeroContent('en'),
    resumeChatDataBase64: chatData.en,
  });
  const indexJaHtml = await buildLocalizedHtml(buildJapaneseTemplate(indexHtmlRaw), {
    ...shared,
    ...contentOptions(options.templates, 'ja'),
    heroContentHtml: buildHeroContent('ja'),
    resumeChatDataBase64: chatData.ja,
  });

  return { indexHtml, indexEnHtml, indexJaHtml };
}

function escapePortfolioPages(pages, escapePatterns) {
  return {
    indexHtml: escapeForTemplateLiteral(pages.indexHtml, escapePatterns),
    indexEnHtml: escapeForTemplateLiteral(pages.indexEnHtml, escapePatterns),
    indexJaHtml: escapeForTemplateLiteral(pages.indexJaHtml, escapePatterns),
  };
}

module.exports = { buildPortfolioPages, escapePortfolioPages };
