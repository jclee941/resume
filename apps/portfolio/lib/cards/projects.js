const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');
const {
  assertFeaturedProjectContract,
  buildProjectEvidence,
  buildProjectReviewRail,
  projectAnchor,
  projectLabelsFor,
} = require('./project-review');

function buildProjectTitle(project, link, hasLink) {
  const titleContent = `${escapeHtml(project.title)}<span class="arrow">↗</span>`;
  return hasLink
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="project-link-title" aria-label="View ${escapeHtml(project.title)} project (opens in new tab)">${titleContent}</a>`
    : `<div class="project-link-title">${titleContent}</div>`;
}

function projectDashboards(project) {
  return Array.isArray(project.dashboards)
    ? project.dashboards.filter((dashboard) => dashboard && dashboard.name && dashboard.url)
    : [];
}

function buildProjectMeta(project) {
  const language = project.language ? escapeHtml(String(project.language)) : null;
  const metaBadges = [];

  if (language) {
    metaBadges.push(
      `<span class="project-meta-badge project-meta-badge--language">${language}</span>`
    );
  }

  if (project.status) {
    metaBadges.push(
      `<span class="project-meta-badge project-meta-badge--status">${escapeHtml(String(project.status))}</span>`
    );
  }

  return metaBadges.join('');
}

function buildProjectLinks(project, githubUrl, demoUrl) {
  const dashboards = projectDashboards(project);
  const linkFragments = [];

  if (githubUrl) {
    linkFragments.push(
      `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} GitHub repository (opens in new tab)">[GitHub]</a>`
    );
  }

  if (dashboards.length > 0) {
    for (const dashboard of dashboards) {
      linkFragments.push(
        `<a href="${escapeHtml(dashboard.url)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} ${escapeHtml(dashboard.name)} dashboard (opens in new tab)">[${escapeHtml(dashboard.name)}]</a>`
      );
    }
  } else if (demoUrl) {
    linkFragments.push(
      `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="Open ${escapeHtml(project.title)} demo (opens in new tab)">[Demo]</a>`
    );
  }

  if (linkFragments.length === 0) {
    return '';
  }

  return `<div class="project-links">
              ${linkFragments.join('')}
            </div>`;
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

  const FEATURED_VISIBLE = 5;
  if (projectsData.some((project) => project.fullStackEvidence)) {
    assertFeaturedProjectContract(projectsData);
  }
  const labels = projectLabelsFor(projectsData);
  const sortedProjects = [...projectsData].sort(
    (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
  );
  const reviewRail = buildProjectReviewRail(sortedProjects, labels);
  const projectItems = sortedProjects
    .map((project, idx) => {
      const githubUrl = project.githubUrl || project.repoUrl;
      const demoUrl = project.demoUrl || project.liveUrl;
      const dashboards = projectDashboards(project);
      const dashboardUrl = dashboards[0]?.url;
      const hasLink = demoUrl || dashboardUrl || githubUrl;
      const link = demoUrl || dashboardUrl || githubUrl;
      const titleElement = buildProjectTitle(project, link, hasLink);
      const metaLine = buildProjectMeta(project);
      const projectLinks = buildProjectLinks(project, githubUrl, demoUrl);
      const evidence = buildProjectEvidence(project, labels);
      // Progressive disclosure: show the top FEATURED_VISIBLE projects (by
      // displayOrder) by default; collapse the rest behind a "\uB354\uBCF4\uAE30" toggle so
      // the section is curated without removing any project from the DOM.
      const collapsed = idx >= FEATURED_VISIBLE;
      const collapsedClass = collapsed ? ' project-item--collapsed' : '';
      const collapsedAttr = collapsed ? ' data-project-extra="true"' : '';
      const anchor = projectAnchor(project, idx);

      return `
         <li id="${escapeHtml(anchor)}" class="project-item project-card card${collapsedClass}"${collapsedAttr} data-tech="${escapeHtml(String(project.tech || ''))}">
             <div class="project-header">
                 <h3 class="project-title">
                     ${titleElement}
                 </h3>
             </div>
              ${evidence}
              <p class="project-description">${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>
              <div class="project-tech">
                  ${escapeHtml(project.tech)}
              </div>
              ${metaLine ? `<div class="project-meta">${metaLine}</div>` : ''}
              ${projectLinks}
          </li>`;
    })
    .join('\n');

  const html = `${reviewRail}\n${projectItems}`;
  TEMPLATE_CACHE.projectCardsHtml = html;
  return html;
}

module.exports = { generateProjectCards };
