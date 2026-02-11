/**
 * Data processing utilities for worker generation
 * @module data-processor
 */

const { TEMPLATE_CACHE } = require('./config');
const { validateData } = require('./validators');
const { calculateDataHash } = require('./utils');
const {
  generateResumeCards,
  generateProjectCards,
  generateCertificationCards,
  generateSkillsList,
  generateHeroContent,
  generateResumeDescription,
  generateInfrastructureCards,
  generateContactGrid,
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
 * @param {{projectDataRaw: string, logger: {log: Function}}} options - Data processing options.
 * @returns {{projectData: Object, dataHash: string, templates: Object}} Processed data payload.
 */
function processProjectData({ projectDataRaw, logger }) {
  const projectData = JSON.parse(projectDataRaw);

  logger.log('🔍 Validating data.json...');
  validateData(projectData);

  const dataHash = calculateDataHash(projectData);
  if (TEMPLATE_CACHE.dataHash !== dataHash) {
    logger.log('📝 Data changed, regenerating templates...');
    TEMPLATE_CACHE.dataHash = dataHash;
  }

  const templates = {
    resumeCardsHtml: generateResumeCards(projectData.resume, dataHash),
    projectCardsHtml: generateProjectCards(projectData.projects, dataHash),
    resumeCardsEnHtml: generateResumeCards(
      projectData.resumeEn || projectData.resume,
      `${dataHash}:en-resume`
    ),
    projectCardsEnHtml: generateProjectCards(
      projectData.projectsEn || projectData.projects,
      `${dataHash}:en-projects`
    ),
    certCardsHtml: generateCertificationCards(projectData.certifications, dataHash),
    skillsHtml: generateSkillsList(projectData.skills, dataHash),
    heroContentHtml: generateHeroContent(projectData.hero),
    resumeDescriptionHtml: generateResumeDescription(
      projectData.sectionDescriptions.resume,
      projectData.achievements
    ),
    infrastructureCardsHtml: generateInfrastructureCards(projectData.infrastructure),
    contactGridHtml: generateContactGrid(projectData.contact),
  };

  return {
    projectData,
    dataHash,
    templates,
  };
}

/**
 * Convert binary assets to base64 strings.
 * @param {{ogImageBuffer: Buffer, ogImageEnBuffer: Buffer, resumePdfBuffer: Buffer}} buffers - Binary assets.
 * @returns {{ogImageBase64: string, ogImageEnBase64: string, resumePdfBase64: string}} Base64 payload.
 */
function encodeBinaryAssets({ ogImageBuffer, ogImageEnBuffer, resumePdfBuffer }) {
  return {
    ogImageBase64: ogImageBuffer.toString('base64'),
    ogImageEnBase64: ogImageEnBuffer.toString('base64'),
    resumePdfBase64: resumePdfBuffer.toString('base64'),
  };
}

module.exports = {
  processProjectData,
  encodeBinaryAssets,
};
