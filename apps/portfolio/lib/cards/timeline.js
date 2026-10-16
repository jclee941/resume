const { escapeHtml } = require('../template-sanitizer');
const { renderIconSvg } = require('../icons');
const { CAREER_UI_META, DEFAULT_CAREER_UI_META } = require('./timeline-career-meta');
const { TIMELINE_LABELS, PHASE_ICONS, olderRoleLabels } = require('./timeline-labels');
const { renderDisclosureButton } = require('./disclosures');
const { renderProse } = require('./atomic-phrases');

const VISIBLE_ROLES = 4;
const VISIBLE_ACHIEVEMENTS = 3;
const TIMELINE_ID = 'career-timeline';

/**
 * @typedef {'ko' | 'en' | 'ja'} Locale
 * @typedef {Object} Career
 * @property {string} company
 * @property {string | null} [companyUrl]
 * @property {string} period
 * @property {string} role
 * @property {string} myRole
 * @property {string} [phase]
 * @property {string} [status]
 * @property {string[]} [achievements]
 * @property {string} [description]
 */

/**
 * Attach the UI-only phase/status keyed by the locale-stable period.
 * @param {Career[]} careers
 * @returns {Array<Career & { phase: string, status: string }>}
 */
function mergeCareerUiMeta(careers) {
  if (!Array.isArray(careers)) return [];
  return careers.map((career) => {
    const meta =
      /** @type {Record<string, { phase: string, status: string }>} */ (CAREER_UI_META)[
        career.period
      ] || DEFAULT_CAREER_UI_META;
    return { ...career, phase: career.phase || meta.phase, status: career.status || meta.status };
  });
}

/**
 * @param {Career} career
 * @returns {string}
 */
function renderCompany(career) {
  const name = escapeHtml(career.company);
  if (!career.companyUrl || !/^https?:\/\//i.test(career.companyUrl)) {
    return `<span class="company-link company-link--text">${name}</span>`;
  }
  return `<a class="company-link" href="${escapeHtml(career.companyUrl)}" target="_blank" rel="noopener noreferrer">${name}</a>`;
}

/**
 * @param {boolean} active
 * @param {(typeof TIMELINE_LABELS)['ko']} labels
 * @returns {string}
 */
function renderStatusBadge(active, labels) {
  if (!active) return '';
  const text =
    labels.inProgressAria && labels.inProgressAria !== labels.inProgress
      ? `<span class="sr-only">${escapeHtml(labels.inProgressAria)}</span><span aria-hidden="true">${escapeHtml(labels.inProgress)}</span>`
      : escapeHtml(labels.inProgress);
  return `<span class="status-badge status-badge--active">${text}</span>`;
}

/**
 * @param {Career} career
 * @param {number} index
 * @param {(typeof TIMELINE_LABELS)['ko']} labels
 * @param {string[]} extraAchievements
 * @param {string} description
 * @param {Locale} locale
 * @returns {string}
 */
function renderDetails(career, index, labels, extraAchievements, description, locale) {
  if (!description && extraAchievements.length === 0) return '';
  const id = `details-${index}`;
  const items = extraAchievements.map((item) => `<li>${renderProse(item, locale)}</li>`).join('');
  const label = `<span class="expand-text" data-disclosure-label>${escapeHtml(labels.expand)}</span>`;
  const button = renderDisclosureButton({
    className: 'timeline-expand-btn',
    controls: id,
    labels: { more: labels.expand, less: labels.collapse },
    names: {
      more: `${labels.expand} ${labels.detail} ${career.company}`,
      less: `${labels.collapse} ${labels.detail} ${career.company}`,
    },
    inner: `${label}${renderIconSvg('chevron', 'expand-icon')}`,
  });
  return `<div class="timeline-details" id="${id}">${
    description ? `<p class="details-description">${renderProse(description, locale)}</p>` : ''
  }${items ? `<ul class="details-achievements">${items}</ul>` : ''}</div>${button}`;
}

/**
 * @param {Career & { phase: string, status: string }} career
 * @param {number} index
 * @param {(typeof TIMELINE_LABELS)['ko']} labels
 * @param {Locale} locale
 * @returns {string}
 */
function renderNode(career, index, labels, locale) {
  const active = career.status === 'active';
  const achievements = career.achievements || [];
  const highlights = achievements.slice(0, VISIBLE_ACHIEVEMENTS);
  const description = career.description || '';
  const phaseLabel =
    /** @type {Record<string, string>} */ (labels.phases)[career.phase] || career.phase;
  const classes = [
    'timeline-node',
    active ? 'timeline-node--active' : '',
    index >= VISIBLE_ROLES ? 'timeline-node--older' : '',
  ];
  const summary =
    highlights.length > 0
      ? `<ul class="timeline-highlights">${highlights.map((item) => `<li>${renderProse(item, locale)}</li>`).join('')}</ul>`
      : description
        ? `<p class="timeline-summary">${renderProse(description, locale)}</p>`
        : '';
  const details = renderDetails(
    career,
    index,
    labels,
    achievements.slice(VISIBLE_ACHIEVEMENTS),
    highlights.length > 0 ? description : '',
    locale
  );
  return (
    `<li class="${classes.filter(Boolean).join(' ')}" role="listitem" data-phase="${escapeHtml(career.phase)}" data-status="${escapeHtml(career.status)}">` +
    `<div class="timeline-marker" aria-hidden="true"><div class="timeline-dot ${active ? 'status--active' : 'status--completed'}"></div></div>` +
    '<div class="timeline-content"><header class="timeline-header">' +
    `<div class="timeline-date"><time>${escapeHtml(career.period)}</time></div>` +
    `<div class="timeline-badges"><span class="phase-badge phase-badge--${escapeHtml(career.phase)}">` +
    `${renderIconSvg(PHASE_ICONS[career.phase] || PHASE_ICONS.기초, 'phase-badge__icon')}` +
    `<span class="sr-only">${escapeHtml(labels.phase)}: </span>${escapeHtml(phaseLabel)}</span>${renderStatusBadge(active, labels)}</div>` +
    `</header><div class="timeline-card"><h3 class="timeline-company">${renderCompany(career)}</h3>` +
    `<p class="timeline-role">${escapeHtml(career.role)}</p><p class="timeline-myrole">${escapeHtml(career.myRole)}</p>` +
    `${summary}${details}</div></div></li>`
  );
}

/**
 * Settled career timeline: the markup the client binds behaviour to without replacing it.
 * @param {Career[] | null | undefined} careers
 * @param {Locale} locale
 * @returns {string} '' when there are no careers to show.
 */
function generateCareerTimeline(careers, locale) {
  const merged = mergeCareerUiMeta(careers || []);
  if (merged.length === 0) return '';
  const labels = TIMELINE_LABELS[locale] || TIMELINE_LABELS.ko;
  const nodes = merged.map((career, index) => renderNode(career, index, labels, locale)).join('');
  const list = `<ul class="incident-timeline resume-list" id="${TIMELINE_ID}" aria-label="${escapeHtml(labels.timeline)}">${nodes}</ul>`;
  const older = merged.length - VISIBLE_ROLES;
  if (older <= 0) return list;
  const button = renderDisclosureButton({
    className: 'timeline-more-btn',
    controls: TIMELINE_ID,
    labels: olderRoleLabels(older, locale),
  });
  return `${list}<div class="timeline-more">${button}</div>`;
}

/**
 * The career section body: the settled timeline, or the plain resume cards when no careers exist.
 * @param {Career[] | null | undefined} careers
 * @param {Locale} locale
 * @param {string} fallbackItemsHtml
 * @returns {string}
 */
function generateCareerSection(careers, locale, fallbackItemsHtml) {
  return (
    generateCareerTimeline(careers, locale) || `<ul class="resume-list">${fallbackItemsHtml}</ul>`
  );
}

module.exports = { generateCareerTimeline, generateCareerSection, mergeCareerUiMeta };
