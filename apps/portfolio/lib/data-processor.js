/**
 * Data processing utilities for worker generation
 * @module data-processor
 */

const { TEMPLATE_CACHE } = require('./config');
const { validatePortfolioData } = require('./validators');
const { calculateDataHash } = require('./content-hashing');
const {
  generateResumeCards,
  generateResumeDescription,
  generateProjectCards,
  generateCertificationCards,
  generateSkillsList,
  generateHeroContent,
  generateInfrastructureCards,
  generateContactGrid,
  generateAboutContent,
} = require('./cards');

/**
 * @typedef {Object} ResumeProject
 * @property {string} icon - Emoji icon for the project
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {string[]} stats - Array of stats/tags
 * @property {boolean} [highlight] - Whether to highlight this card
 * @property {string} [completePdfUrl] - URL for complete PDF (highlighted cards)
 * @property {string} [pdfUrl] - URL for PDF (standard cards)
 * @property {string} [docxUrl] - URL for DOCX (standard cards)
 */

/**
 * @typedef {Object} Dashboard
 * @property {string} name - Dashboard name
 * @property {string} url - Dashboard URL
 */

/**
 * @typedef {Object} Project
 * @property {string} icon - Emoji icon for the project
 * @property {string} title - Project title
 * @property {string} tech - Technology stack
 * @property {string} description - Project description
 * @property {Dashboard[]} [dashboards] - Array of dashboards (for Grafana project)
 * @property {string} [documentationUrl] - Documentation URL
 * @property {string} [liveUrl] - Live demo URL
 * @property {string} [repoUrl] - Repository URL (GitHub/GitLab)
 */

/**
 * @typedef {Object} LinkConfig
 * @property {string} url - Link URL
 * @property {string} text - Link text
 * @property {string} className - CSS class name
 * @property {string} ariaLabel - Accessibility label
 * @property {boolean} [isExternal] - Whether link opens in new tab
 * @property {boolean} [isDownload] - Whether link is a download
 */

/**
 * Validate source data and build reusable HTML fragments.
 * @param {{projectDataRaw: string, projectDataEnRaw?: string, projectDataJaRaw?: string, logger: {log: Function}}} options - Data processing options.
 * @returns {{projectData: Object, dataHash: string, templates: Object}} Processed data payload.
 */
function processProjectData({ projectDataRaw, projectDataEnRaw, projectDataJaRaw, logger }) {
  const projectData = JSON.parse(projectDataRaw);
  const projectDataEn = projectDataEnRaw ? JSON.parse(projectDataEnRaw) : null;
  const projectDataJa = projectDataJaRaw ? JSON.parse(projectDataJaRaw) : null;

  logger.log('🔍 Validating data.json...');
  validatePortfolioData(projectData, { logger });

  const dataHash = calculateDataHash(projectData);
  if (TEMPLATE_CACHE.dataHash !== dataHash) {
    logger.log('📝 Data changed, regenerating templates...');
    TEMPLATE_CACHE.dataHash = dataHash;
  }

  const templates = {
    resumeCardsHtml: generateResumeCards(projectData.resume, dataHash),
    projectCardsHtml: generateProjectCards(projectData.projects, dataHash),
    resumeCardsEnHtml: generateResumeCards(
      (projectDataEn && projectDataEn.resume) || projectData.resumeEn || projectData.resume,
      `${dataHash}:en-resume`
    ),
    projectCardsEnHtml: generateProjectCards(
      (projectDataEn && projectDataEn.projects) || projectData.projectsEn || projectData.projects,
      `${dataHash}:en-projects`
    ),
    resumeCardsJaHtml: generateResumeCards(
      (projectDataJa && projectDataJa.resume) || projectData.resume,
      `${dataHash}:ja-resume`
    ),
    projectCardsJaHtml: generateProjectCards(
      (projectDataJa && projectDataJa.projects) || projectData.projects,
      `${dataHash}:ja-projects`
    ),
    certCardsHtml: generateCertificationCards(projectData.certifications, dataHash),
    skillsHtml: generateSkillsList(projectData.skills, dataHash),
    skillsEnHtml: generateSkillsList(
      (projectDataEn && projectDataEn.skills) || projectData.skills,
      `${dataHash}:en-skills`
    ),
    skillsJaHtml: generateSkillsList(
      (projectDataJa && projectDataJa.skills) || projectData.skills,
      `${dataHash}:ja-skills`
    ),
    heroContentHtml: generateHeroContent({ ...projectData.hero, email: projectData.contact && projectData.contact.email }),
    resumeDescriptionHtml: generateResumeDescription(projectData.resume),
    infrastructureCardsHtml: generateInfrastructureCards(projectData.infrastructure),
    infrastructureCardsEnHtml: generateInfrastructureCards(
      (projectDataEn && projectDataEn.infrastructure) || projectData.infrastructure
    ),
    infrastructureCardsJaHtml: generateInfrastructureCards(
      (projectDataJa && projectDataJa.infrastructure) || projectData.infrastructure
    ),
    contactGridHtml: generateContactGrid(projectData.contact),
    aboutContentHtml: generateAboutContent(projectData.aboutSection, dataHash),
    aboutContentEnHtml: generateAboutContent(
      (projectDataEn && projectDataEn.aboutSection) || projectData.aboutSection,
      `${dataHash}:en-about`
    ),
    aboutContentJaHtml: generateAboutContent(
      (projectDataJa && projectDataJa.aboutSection) || projectData.aboutSection,
      `${dataHash}:ja-about`
    ),
  };

  return {
    projectData,
    dataHash,
    templates,
  };
}

/**
 * Convert binary assets to base64 strings.
 * @param {{ogImageBuffer: Buffer, ogImageEnBuffer: Buffer, ogImageJaBuffer?: Buffer, resumePdfBuffer: Buffer}} buffers - Binary assets.
 * @returns {{ogImageBase64: string, ogImageEnBase64: string, ogImageJaBase64: string, resumePdfBase64: string}} Base64 payload.
 */
function encodeBinaryAssets({ ogImageBuffer, ogImageEnBuffer, ogImageJaBuffer, resumePdfBuffer }) {
  return {
    ogImageBase64: ogImageBuffer.toString('base64'),
    ogImageEnBase64: ogImageEnBuffer.toString('base64'),
    ogImageJaBase64: (ogImageJaBuffer && ogImageJaBuffer.length > 0)
      ? ogImageJaBuffer.toString('base64')
      : '',
    resumePdfBase64: resumePdfBuffer.toString('base64'),
  };
}

module.exports = {
  processProjectData,
  encodeBinaryAssets,
};
