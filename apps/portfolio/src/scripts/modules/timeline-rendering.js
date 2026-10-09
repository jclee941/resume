import { createIconElement } from './project-card-formatting.js';

/**
 * @typedef {'운영' | '구축' | '자동화' | '안정화' | '기초'} TimelinePhase
 */

/**
 * @typedef {Object} TimelineCareer
 * @property {string} company
 * @property {string} [companyUrl]
 * @property {string} period
 * @property {string} role
 * @property {string} myRole
 * @property {TimelinePhase} phase
 * @property {'active' | 'completed' | string} status
 * @property {string[]} [achievements]
 * @property {string} [description]
 */

/**
 * @typedef {ReturnType<typeof createTimelineViewModel>} TimelineViewModel
 */

const TIMELINE_LABELS = {
  ko: {
    period: '근무 기간',
    phase: '단계',
    detail: '상세 내용',
    expand: '상세 보기',
    collapse: '접기',
    inProgress: '진행 중',
    inProgressAria: '현재 진행 중',
    phases: { 운영: '운영', 구축: '구축', 자동화: '자동화', 안정화: '안정화', 기초: '기초' },
  },
  en: {
    period: 'Tenure',
    phase: 'Phase',
    detail: 'Details',
    expand: 'View details',
    collapse: 'Collapse',
    inProgress: 'In progress',
    inProgressAria: 'Currently in progress',
    phases: {
      운영: 'Operate',
      구축: 'Build',
      자동화: 'Automate',
      안정화: 'Stabilize',
      기초: 'Foundation',
    },
  },
  ja: {
    period: '在籍期間',
    phase: 'フェーズ',
    detail: '詳細',
    expand: '詳細を見る',
    collapse: '閉じる',
    inProgress: '進行中',
    inProgressAria: '現在進行中',
    phases: { 운영: '運用', 구축: '構築', 자동화: '自動化', 안정화: '安定化', 기초: '基礎' },
  },
};

const PHASE_STAGES = {
  운영: { icon: 'search' },
  구축: { icon: 'layers' },
  자동화: { icon: 'shield' },
  안정화: { icon: 'sync' },
  기초: { icon: 'automation' },
};

function timelineLang() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'ko';
}

export function getTimelineLabels() {
  return TIMELINE_LABELS[timelineLang()] || TIMELINE_LABELS.ko;
}

const VISIBLE_ACHIEVEMENTS = 3;

/**
 * @param {TimelineCareer} career
 * @param {number} index
 */
export function createTimelineViewModel(career, index) {
  const phaseInfo = PHASE_STAGES[career.phase] || PHASE_STAGES['기초'];
  const labels = getTimelineLabels();
  const isActive = career.status === 'active';
  const phaseLabel = (labels.phases && labels.phases[career.phase]) || career.phase;
  const achievements = career.achievements || [];
  return {
    ...career,
    index,
    labels,
    phaseIcon: phaseInfo.icon,
    phaseLabel,
    isActive,
    highlights: achievements.slice(0, VISIBLE_ACHIEVEMENTS),
    extraAchievements: achievements.slice(VISIBLE_ACHIEVEMENTS),
    description: career.description || '',
  };
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {TimelineViewModel} model
 * @returns {HTMLElement}
 */
function companyElement(model) {
  if (!model.companyUrl) return el('span', 'company-link company-link--text', model.company);
  const link = el('a', 'company-link', model.company);
  link.href = model.companyUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function createExpandIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [name, value] of Object.entries({
    class: 'expand-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
  })) {
    svg.setAttribute(name, value);
  }
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 9l6 6 6-6');
  svg.appendChild(path);
  return svg;
}

/**
 * @param {TimelineViewModel} model
 * @param {string} description
 * @returns {DocumentFragment}
 */
function createDetails(model, description) {
  const details = el('div', 'timeline-details');
  details.id = `details-${model.index}`;
  details.setAttribute('aria-hidden', 'true');
  if (description) details.appendChild(el('p', 'details-description', description));
  if (model.extraAchievements.length > 0) {
    const list = el('ul', 'details-achievements');
    model.extraAchievements.forEach((item) => list.appendChild(el('li', '', item)));
    details.appendChild(list);
  }

  const button = el('button', 'timeline-expand-btn');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', details.id);
  button.setAttribute(
    'aria-label',
    `${model.labels.expand} ${model.labels.detail} ${model.company}`
  );
  button.append(el('span', 'expand-text', model.labels.expand), createExpandIcon());

  const fragment = document.createDocumentFragment();
  fragment.append(details, button);
  return fragment;
}

/**
 * @param {TimelineCareer} career
 * @param {number} index
 * @returns {HTMLLIElement}
 */
export function createTimelineNode(career, index) {
  const model = createTimelineViewModel(career, index);
  const node = el('li', `timeline-node${model.isActive ? ' timeline-node--active' : ''}`);
  node.setAttribute('role', 'listitem');
  node.tabIndex = 0;
  node.dataset.phase = model.phase;
  node.dataset.status = model.status;
  node.setAttribute('aria-label', `${model.company} - ${model.period}`);

  const marker = el('div', 'timeline-marker');
  marker.setAttribute('aria-hidden', 'true');
  marker.appendChild(
    el('div', `timeline-dot ${model.isActive ? 'status--active' : 'status--completed'}`)
  );

  const content = el('div', 'timeline-content');
  const header = el('header', 'timeline-header');
  const date = el('div', 'timeline-date');
  date.appendChild(el('time', '', model.period));
  const badges = el('div', 'timeline-badges');
  const phase = el('span', `phase-badge phase-badge--${model.phase}`);
  phase.setAttribute('aria-label', `${model.labels.phase}: ${model.phaseLabel}`);
  phase.append(createIconElement(model.phaseIcon, 'phase-badge__icon'), ` ${model.phaseLabel}`);
  badges.appendChild(phase);
  if (model.isActive) {
    const status = el('span', 'status-badge status-badge--active', model.labels.inProgress);
    status.setAttribute('aria-label', model.labels.inProgressAria);
    badges.appendChild(status);
  }
  header.append(date, badges);

  const card = el('div', 'timeline-card');
  card.tabIndex = -1;
  const company = el('h3', 'timeline-company');
  company.appendChild(companyElement(model));
  card.append(
    company,
    el('p', 'timeline-role', model.role),
    el('p', 'timeline-myrole', model.myRole)
  );

  if (model.highlights.length > 0) {
    const highlights = el('ul', 'timeline-highlights');
    model.highlights.forEach((item) => highlights.appendChild(el('li', '', item)));
    card.appendChild(highlights);
  } else if (model.description) {
    card.appendChild(el('p', 'timeline-summary', model.description));
  }

  const detailDescription = model.highlights.length > 0 ? model.description : '';
  if (detailDescription || model.extraAchievements.length > 0) {
    card.appendChild(createDetails(model, detailDescription));
  }

  content.append(header, card);
  node.append(marker, content);
  return node;
}
