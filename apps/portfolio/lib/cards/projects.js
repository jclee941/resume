const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');

function buildProjectTitle(project, link, hasLink) {
  const titleContent = `${escapeHtml(project.title)}<span class="arrow">↗</span>`;
  return hasLink
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="project-link-title" aria-label="View ${escapeHtml(project.title)} project (opens in new tab)">${titleContent}</a>`
    : `<div class="project-link-title">${titleContent}</div>`;
}

function buildProjectMeta(project, githubUrl, demoUrl) {
  const language = project.language ? escapeHtml(String(project.language)) : null;
  const metaBadges = [];

  if (language) {
    metaBadges.push(
      `<span class="project-meta-badge project-meta-badge--language">${language}</span>`
    );
  }

  metaBadges.push('<span class="project-meta-badge project-meta-badge--active">ACTIVE</span>');

  if (demoUrl) {
    metaBadges.push('<span class="project-meta-badge project-meta-badge--live">LIVE</span>');
  } else if (githubUrl) {
    metaBadges.push('<span class="project-meta-badge project-meta-badge--repo">REPO</span>');
  }

  return metaBadges.join('');
}

function buildProjectLinks(project, githubUrl, demoUrl) {
  return githubUrl || demoUrl
    ? `<div class="project-links">
              ${
                githubUrl
                  ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} GitHub repository (opens in new tab)">[GitHub]</a>`
                  : ''
              }
              ${
                demoUrl
                  ? `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} demo (opens in new tab)">[Demo]</a>`
                  : ''
              }
            </div>`
    : '';
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

  const html = [...projectsData]
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
    .map((project) => {
      const githubUrl = project.githubUrl || project.repoUrl;
      const demoUrl = project.demoUrl || project.liveUrl;
      const hasLink = demoUrl || githubUrl;
      const link = demoUrl || githubUrl;
      const titleElement = buildProjectTitle(project, link, hasLink);
      const metaLine = buildProjectMeta(project, githubUrl, demoUrl);
      const projectLinks = buildProjectLinks(project, githubUrl, demoUrl);

      return `
         <li class="project-item project-card card" data-tech="${escapeHtml(String(project.tech || ''))}">
             <div class="project-header">
                 <h3 class="project-title">
                     ${titleElement}
                 </h3>
             </div>
              <p class="project-description">${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>
              <div class="project-tech">
                  ${escapeHtml(project.tech)}
              </div>
              ${metaLine ? `<div class="project-meta" aria-label="Project activity metadata">${metaLine}</div>` : ''}
              ${projectLinks}
          </li>`;
    })
    .join('\n');

  TEMPLATE_CACHE.projectCardsHtml = html;
  return html;
}

module.exports = { generateProjectCards };
