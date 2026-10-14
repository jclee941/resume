const { TEMPLATE_CACHE } =
  /** @type {{ TEMPLATE_CACHE: { dataHash: string | null, projectCardsHtml: string | null } }} */ (
    require('../config')
  );
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');
const {
  buildProjectCaseNotes,
  detectLocale,
  projectAnchor,
  projectDescriptionRemainder,
  projectLabelsFor,
} = require('./project-review');
const { renderProjectDiagram } = require('./project-diagram');

const FEATURED_VISIBLE = 3;
const FEATURED_DIAGRAMS = 3;

/**
 * @param {string} title
 * @param {string} name
 * @param {'ko' | 'en' | 'ja'} locale
 * @param {boolean} [titleLink=false]
 * @returns {string}
 */
function projectLinkLabel(title, name, locale, titleLink = false) {
  if (locale === 'ko') return escapeHtml(`${title} ${name} 새 탭에서 열기`);
  if (locale === 'ja') return escapeHtml(`${title} ${name}（新しいタブで開く）`);
  return escapeHtml(`${titleLink ? 'View' : 'Open'} ${title} ${name} (opens in new tab)`);
}

/**
 * @typedef {Object} Dashboard
 * @property {string} name
 * @property {string} url
 */

/**
 * @typedef {Object} Project
 * @property {string | number} [id]
 * @property {string} title
 * @property {string} description
 * @property {string} tech
 * @property {string} [name]
 * @property {string} [tagline]
 * @property {string} [period]
 * @property {string} [language]
 * @property {string} [githubUrl]
 * @property {string} [repoUrl]
 * @property {string} [demoUrl]
 * @property {string} [liveUrl]
 * @property {number} [displayOrder]
 * @property {Dashboard[]} [dashboards]
 * @property {import('./project-diagram').DiagramSpec} [diagram]
 */

/**
 * @param {Project} project
 * @param {string | undefined} link
 * @param {unknown} hasLink
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function buildProjectTitle(project, link, hasLink, locale) {
  const title = escapeHtml(project.title);
  const name = { ko: '프로젝트', en: 'project', ja: 'プロジェクト' }[locale];
  return hasLink
    ? `<a href="${escapeHtml(/** @type {string} */ (link))}" target="_blank" rel="noopener noreferrer" class="project-link-title" aria-label="${projectLinkLabel(project.title, name, locale, true)}">${title}<span class="arrow">↗</span></a>`
    : `<span class="project-title-text">${title}</span>`;
}

/**
 * @param {Project} project
 * @returns {Dashboard[]}
 */
function projectDashboards(project) {
  return Array.isArray(project.dashboards)
    ? project.dashboards.filter((dashboard) => dashboard && dashboard.name && dashboard.url)
    : [];
}

/**
 * @param {string | undefined | null} period
 * @param {import('./project-review').ProjectLabels} labels
 * @returns {string | null}
 */
function projectActivityBadge(period, labels) {
  if (typeof period !== 'string') return null;
  const [, end] = period.split('~').map((part) => part.trim());
  if (['현재', 'Present', '現在'].includes(end)) {
    return `<span class="project-meta-badge project-meta-badge--active">${labels.active}</span>`;
  }
  if (/^\d{4}\.\d{2}$/.test(end)) {
    return `<span class="project-meta-badge project-meta-badge--completed">${labels.completed}</span>`;
  }
  return null;
}

/**
 * @param {Project} project
 * @param {import('./project-review').ProjectLabels} labels
 * @param {string | undefined} [demoUrl]
 * @returns {string}
 */
function buildProjectMeta(project, labels, demoUrl) {
  if (demoUrl || projectDashboards(project).length > 0) {
    return `<span class="project-meta-badge project-meta-badge--live">${labels.live}</span>`;
  }
  return projectActivityBadge(project.period, labels) || '';
}

/**
 * @param {Project} project
 * @param {'ko' | 'en' | 'ja'} locale
 * @param {string | undefined} [githubUrl]
 * @param {string | undefined} [demoUrl]
 * @returns {string}
 */
function buildProjectLinks(project, locale, githubUrl, demoUrl) {
  const dashboards = projectDashboards(project);
  const linkFragments = [];

  if (githubUrl) {
    const name = locale === 'en' ? 'GitHub repository' : 'GitHub';
    linkFragments.push(
      `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="${projectLinkLabel(project.title, name, locale)}">GitHub<span class="arrow" aria-hidden="true">↗</span></a>`
    );
  }

  if (dashboards.length > 0) {
    for (const dashboard of dashboards) {
      linkFragments.push(
        `<a href="${escapeHtml(dashboard.url)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="${projectLinkLabel(project.title, dashboard.name, locale)}">${escapeHtml(dashboard.name)}<span class="arrow" aria-hidden="true">↗</span></a>`
      );
    }
  } else if (demoUrl) {
    // The visible text is localized like the accessible name so the name contains the label
    // (WCAG 2.5.3); the English name stays lowercase and matches case-insensitively.
    const name = { ko: '데모', en: 'demo', ja: 'デモ' }[locale];
    const visible = { ko: '데모', en: 'Demo', ja: 'デモ' }[locale];
    linkFragments.push(
      `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn" aria-label="${projectLinkLabel(project.title, name, locale)}">${visible}<span class="arrow" aria-hidden="true">↗</span></a>`
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
 * @param {Array<Project>} projectsData - Array of project objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for project list items
 */
function generateProjectCards(projectsData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.projectCardsHtml) {
    logger.log('✓ Using cached project HTML');
    return TEMPLATE_CACHE.projectCardsHtml;
  }

  const labels = projectLabelsFor(projectsData);
  const locale = detectLocale(projectsData);
  const sortedProjects = [...projectsData].sort(
    (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
  );
  const projectItems = sortedProjects
    .map((project, idx) => {
      const githubUrl = project.githubUrl || project.repoUrl;
      const demoUrl = [project.demoUrl, project.liveUrl].find(
        (url) => url && url.replace(/\/$/, '') !== githubUrl?.replace(/\/$/, '')
      );
      const dashboards = projectDashboards(project);
      const dashboardUrl = dashboards[0]?.url;
      const hasLink = demoUrl || dashboardUrl || githubUrl;
      const link = demoUrl || dashboardUrl || githubUrl;
      const titleElement = buildProjectTitle(project, link, hasLink, locale);
      const metaLine = buildProjectMeta(project, labels, demoUrl);
      const projectLinks = buildProjectLinks(project, locale, githubUrl, demoUrl);
      const caseNotes = buildProjectCaseNotes(project, labels);
      const diagram =
        idx < FEATURED_DIAGRAMS && project.diagram
          ? renderProjectDiagram(project.diagram, {
              title: `${project.title} ${labels.diagram}`,
              desc: project.diagram.nodes.map((node) => node.label).join(' → '),
            })
          : '';
      const descriptionRemainder = projectDescriptionRemainder(project);
      // Progressive disclosure: show the top FEATURED_VISIBLE projects (by
      // displayOrder) by default; collapse the rest behind a "\uB354\uBCF4\uAE30" toggle so
      // the section is curated without removing any project from the DOM.
      const collapsed = idx >= FEATURED_VISIBLE;
      const collapsedClass = collapsed ? ' project-item--collapsed' : '';
      const featuredClass = diagram ? ' project-card--featured' : '';
      const collapsedAttr = collapsed ? ' data-project-extra="true"' : '';
      const anchor = projectAnchor(project, idx);

      return `
         <li id="${escapeHtml(anchor)}" class="project-item project-card card${featuredClass}${collapsedClass}"${collapsedAttr} data-tech="${escapeHtml(String(project.tech || ''))}">
             <div class="project-header">
                 <h3 class="project-title">
                     ${titleElement}
                 </h3>
             </div>
              ${caseNotes}
              ${diagram}
              ${descriptionRemainder ? `<p class="project-description">${escapeHtml(descriptionRemainder)}</p>` : ''}
              <div class="project-tech">
                  ${escapeHtml(project.tech)}
              </div>
              ${metaLine ? `<div class="project-meta">${metaLine}</div>` : ''}
              ${projectLinks}
          </li>`;
    })
    .join('\n');

  const html = projectItems;
  TEMPLATE_CACHE.projectCardsHtml = html;
  return html;
}

module.exports = { generateProjectCards };
