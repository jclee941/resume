/**
 * Card generation functions for resume and project cards
 * @module cards
 */

const { TEMPLATE_CACHE } = require('./config');
const { escapeHtml } = require('./utils');
const logger = require('../logger');

/**
 * @description Generate resume list items HTML from JSON data
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
      const metricsLine =
        item.metrics && typeof item.metrics === 'object'
          ? Object.entries(item.metrics)
              .filter(
                ([key, value]) => key && value !== null && value !== undefined && value !== ''
              )
              .map(([key, value]) => `${escapeHtml(String(key))}=${escapeHtml(String(value))}`)
              .join(' | ')
          : '';

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
          ${metricsLine ? `<div class="resume-metrics">[METRICS] ${metricsLine}</div>` : ''}
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
      const githubUrl = project.githubUrl || project.repoUrl;
      const demoUrl = project.demoUrl || project.liveUrl;
      const hasLink = demoUrl || githubUrl;
      const link = demoUrl || githubUrl;

      // Render as anchor tag only if link exists, otherwise use div
      const titleContent = `${escapeHtml(project.title)}<span class="arrow">↗</span>`;
      const titleElement = hasLink
        ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="project-link-title" aria-label="View ${escapeHtml(project.title)} project">${titleContent}</a>`
        : `<div class="project-link-title">${titleContent}</div>`;

      const stars = Number.isFinite(project.stars) ? project.stars : null;
      const forks = Number.isFinite(project.forks) ? project.forks : null;
      const language = project.language ? escapeHtml(String(project.language)) : null;
      const metaLineParts = [];
      if (stars !== null) metaLineParts.push(`★ ${escapeHtml(String(stars))}`);
      if (language) metaLineParts.push(language);
      if (forks !== null) metaLineParts.push(`⑂ ${escapeHtml(String(forks))}`);
      const metaLine = metaLineParts.join('  ');

      const projectLinks =
        githubUrl || demoUrl
          ? `<div class="project-links">
              ${
                githubUrl
                  ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} GitHub repository">[GitHub]</a>`
                  : ''
              }
              ${
                demoUrl
                  ? `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} demo">[Demo]</a>`
                  : ''
              }
            </div>`
          : '';

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
              ${metaLine ? `<div class="project-meta">${metaLine}</div>` : ''}
              ${projectLinks}
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

  return certData
    .map((c) => {
      const normalizedStatus = String(c.status || '').toLowerCase();
      const isActive = normalizedStatus === 'active';
      const isExpired = normalizedStatus === 'expired';
      const statusClass = isActive
        ? 'cert-status--active'
        : isExpired
          ? 'cert-status--expired'
          : 'cert-status--pending';
      const statusLabel = isActive
        ? 'ACTIVE'
        : isExpired
          ? 'EXPIRED'
          : String(c.status || 'UNKNOWN').toUpperCase();

      const dateText = c.date ? String(c.date) : 'TBD';
      const expirationText = c.expirationDate ? String(c.expirationDate) : 'N/A';

      return `<li class="cert-item">
        <span class="cert-status ${statusClass}">[${escapeHtml(statusLabel)}]</span>
        <span class="cert-name">${escapeHtml(c.name)}</span>
        <span class="cert-issuer">${escapeHtml(c.issuer || 'Unknown Issuer')}</span>
        <span class="cert-date">${escapeHtml(dateText)} / exp ${escapeHtml(expirationText)}</span>
      </li>`;
    })
    .join('\n');
}

function generateSkillsList(skillsData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.skillsHtml) {
    logger.log('✓ Using cached skills HTML');
    return TEMPLATE_CACHE.skillsHtml;
  }

  const categoryOrder = [
    'observability',
    'security',
    'cloud',
    'devops',
    'automation',
    'database',
    'programming',
    'compliance',
  ];

  const html = categoryOrder
    .map((key) => {
      const skillData = skillsData[key];
      if (!skillData) return '';

      let skills = [];
      if (Array.isArray(skillData)) skills = skillData;
      else if (skillData.items) skills = skillData.items;

      if (skills.length === 0) return '';

      const proficiencyValues = skills
        .map((s) => Number(s && s.proficiency))
        .filter((value) => Number.isFinite(value));

      const averageLevel =
        proficiencyValues.length > 0
          ? Math.round(
              proficiencyValues.reduce((sum, value) => sum + value, 0) / proficiencyValues.length
            )
          : 0;

      const label = escapeHtml(String(skillData.title || key).replace(/\s*&\s*/g, ' & '));

      const barWidth = 20;
      const filled = Math.round((averageLevel / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      return `<li class="htop-row">
        <span class="htop-label">${label}</span>
        <span class="htop-bar">[<span class="htop-filled">${bar}</span>]</span>
        <span class="htop-pct">${averageLevel}%</span>
        <span class="htop-items">${skills
          .slice(0, 4)
          .map((s) => {
            if (typeof s === 'string') return escapeHtml(s);
            const name = escapeHtml(String(s && s.name ? s.name : 'Unknown'));
            const proficiency = Number(s && s.proficiency);
            return Number.isFinite(proficiency)
              ? `${name}[${escapeHtml(String(proficiency))}]`
              : name;
          })
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
 * @param {Array} infraData - Array of infrastructure objects with {icon, title, description, status, url?}
 * @returns {string} HTML string for infrastructure cards
 */
function generateInfrastructureCards(infraData) {
  if (!infraData || infraData.length === 0) return '';

  return infraData
    .map((item) => {
      const statusClass =
        item.status === 'running' ? 'infra-status--running' : 'infra-status--stopped';
      const statusLabel = item.status === 'running' ? 'RUNNING' : 'STOPPED';
      const titleContent = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="infra-link" aria-label="Open ${escapeHtml(item.title)} (opens in new tab)">${escapeHtml(item.icon)} ${escapeHtml(item.title)} <span class="arrow">↗</span></a>`
        : `<span>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</span>`;

      return `
        <li class="infra-card">
          <div class="infra-header">
            <span class="infra-title">${titleContent}</span>
            <span class="infra-status ${statusClass}">[${statusLabel}]</span>
          </div>
          <p class="infra-desc">${escapeHtml(item.description)}</p>
        </li>`;
    })
    .join('\n');
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
        <a href="${escapeHtml(contactData.linkedin)}" target="_blank" rel="noopener noreferrer" class="contact-item" role="listitem" aria-label="View LinkedIn profile (opens in new tab)">LinkedIn</a>
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
