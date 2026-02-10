/**
 * Card generation functions for resume and project cards
 * @module cards
 */

const { TEMPLATE_CACHE } = require('./config');
const { escapeHtml } = require('./utils');
const logger = require('../logger');

/**
 * Generate resume list items HTML from JSON data
 * @param {Array} resumeData - Array of resume project objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for resume list items
 */
function generateResumeCards(resumeData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.resumeCardsHtml) {
    logger.log('✓ Using cached resume HTML');
    return TEMPLATE_CACHE.resumeCardsHtml;
  }

  const html = resumeData
    .map((item) => {
      // Minimal list item structure
      return `
        <li class="resume-item card">
          <div class="resume-header">
            <h3 class="resume-title">${escapeHtml(item.title)}</h3>
            <span class="resume-period">${escapeHtml(item.period)}</span>
          </div>
          <p class="resume-description">${escapeHtml(item.description).replace(/\n/g, '<br>')}</p>
          ${
            item.stats && item.stats.length > 0
              ? `<div class="resume-tags">
                  ${item.stats.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
                 </div>`
              : ''
          }
        </li>`;
    })
    .join('\n');

  TEMPLATE_CACHE.resumeCardsHtml = html;
  return html;
}

/**
 * Generate project list items HTML from JSON data
 * @param {Array} projectsData - Array of project objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for project list items
 */
function generateProjectCards(projectsData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.projectCardsHtml) {
    logger.log('✓ Using cached project HTML');
    return TEMPLATE_CACHE.projectCardsHtml;
  }

  const html = projectsData
    .map((project) => {
      const hasLink = project.liveUrl || project.repoUrl;
      const link = project.liveUrl || project.repoUrl;
      const _linkText = project.liveUrl ? 'Live Demo' : project.repoUrl ? 'GitHub' : '';

      // Render as anchor tag only if link exists, otherwise use div
      const titleContent = `${escapeHtml(project.title)}<span class="arrow">↗</span>`;
      const titleElement = hasLink
        ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="project-link-title" aria-label="View ${escapeHtml(project.title)} project">${titleContent}</a>`
        : `<div class="project-link-title">${titleContent}</div>`;

      return `
         <li class="project-item card">
             <div class="project-header">
                 <h3 class="project-title">
                     ${titleElement}
                 </h3>
             </div>
             <p class="project-description">${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>
             <div class="project-tech">
                 ${escapeHtml(project.tech)}
             </div>
         </li>`;
    })
    .join('\n');

  TEMPLATE_CACHE.projectCardsHtml = html;
  return html;
}

/**
 * Generate certification cards HTML from JSON data
 * @param {Array} certData - Array of certification objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for certification cards
 */
function generateCertificationCards(certData, _dataHash) {
  // Minimal or empty
  if (!certData || certData.length === 0) return '';

  // Just return a simple list
  return certData
    .map((c) => `<li class="cert-item">${escapeHtml(c.name)} (${escapeHtml(c.issuer)})</li>`)
    .join('\n');
}

function generateSkillsList(skillsData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.skillsHtml) {
    logger.log('✓ Using cached skills HTML');
    return TEMPLATE_CACHE.skillsHtml;
  }

  const categories = {
    observability: { label: 'Observability', level: 95 },
    security: { label: 'Security', level: 90 },
    cloud: { label: 'Cloud', level: 85 },
    devops: { label: 'DevOps', level: 85 },
    automation: { label: 'Automation', level: 80 },
    database: { label: 'Database', level: 70 },
  };

  const html = Object.entries(categories)
    .map(([key, config]) => {
      const skillData = skillsData[key];
      if (!skillData) return '';

      let skills = [];
      if (Array.isArray(skillData)) skills = skillData;
      else if (skillData.items) skills = skillData.items;

      if (skills.length === 0) return '';

      const barWidth = 20;
      const filled = Math.round((config.level / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      return `<li class="htop-row">
        <span class="htop-label">${config.label}</span>
        <span class="htop-bar">[<span class="htop-filled">${bar}</span>]</span>
        <span class="htop-pct">${config.level}%</span>
        <span class="htop-items">${skills
          .slice(0, 4)
          .map((s) => escapeHtml(typeof s === 'string' ? s : s.name))
          .join(', ')}</span>
      </li>`;
    })
    .join('\n');

  TEMPLATE_CACHE.skillsHtml = html;
  return html;
}

/**
 * Generate hero section HTML from data
 * ✅ FIXED: Added aria-label to email link for accessibility
 * @param {Object} heroData - Hero section data
 * @returns {string} HTML string for hero section
 */
function generateHeroContent(heroData) {
  return `
    <h1 class="hero-name">${escapeHtml(heroData.titleEn)}</h1>
    <h2 class="hero-subtitle">${escapeHtml(heroData.subtitle)}</h2>
    <div class="hero-contact">
       <a href="mailto:qws941@kakao.com" class="hero-link" aria-label="Email Jaecheol Lee at qws941@kakao.com">qws941@kakao.com</a>
    </div>
  `;
}

/**
 * Generate resume section description
 * @returns {string} Empty string for minimal design
 */
function generateResumeDescription() {
  return '';
}

/**
 * Generate infrastructure cards HTML from data
 * @returns {string} Empty string
 */
function generateInfrastructureCards() {
  return '';
}

/**
 * Generate contact grid HTML from data
 * ✅ FIXED: Added aria-labels to all links for accessibility
 * ✅ FIXED: Added target="_blank" and rel to website link
 * @param {Object} contactData - Contact information object
 * @returns {string} HTML string with accessible footer links
 */
function generateContactGrid(contactData) {
  return `
        <a href="${escapeHtml(contactData.github)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="View GitHub profile (opens in new tab)">GitHub</a>
        <a href="mailto:${escapeHtml(contactData.email)}" class="contact-item" role="listitem" aria-label="Send email to ${escapeHtml(contactData.email)}">Email</a>
        <a href="${escapeHtml(contactData.website)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="Visit portfolio website (opens in new tab)">Website</a>
  `;
}

module.exports = {
  generateResumeCards,
  generateProjectCards,
  generateCertificationCards,
  generateSkillsList,
  generateHeroContent,
  generateResumeDescription,
  generateInfrastructureCards,
  generateContactGrid,
};
