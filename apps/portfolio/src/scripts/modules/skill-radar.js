import { createIconElement } from './project-card-formatting.js';
import { resolveSkillData, skillCountText } from './skill-radar-data.js';

const CJK_SKILL_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

function skillGridLabel() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'Skills';
  if (lang.startsWith('ja')) return 'スキル';
  return '기술 스택';
}

/**
 * @param {keyof HTMLElementTagNameMap} tagName
 * @param {string} className
 * @param {string} [text]
 */
function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

/** @param {string} domainKey */
function createSkillDomainIcon(domainKey) {
  /** @type {Record<string, string>} */
  const icons = {
    automation: 'automation',
    backendApi: 'server',
    cicdAutomation: 'sync',
    cloud: 'cloud',
    cloudEdge: 'cloud',
    compliance: 'check',
    database: 'database',
    devops: 'git',
    infrastructureAsCode: 'code',
    observability: 'chart',
    programming: 'code',
    security: 'shield',
    securityAutomation: 'shield',
  };
  return createIconElement(icons[domainKey] || 'layers');
}

/**
 * @param {string} domainKey
 * @param {import('./skill-radar-data.js').LocaleRadarCategory} domain
 */
function createDomainCard(domainKey, domain) {
  const card = createElement('article', 'skill-domain-card');
  card.dataset.domain = domainKey;
  const headingId = `skill-domain-${domainKey}`;
  card.setAttribute('aria-labelledby', headingId);

  const icon = createElement('div', 'skill-domain-card__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.appendChild(createSkillDomainIcon(domainKey));
  const title = createElement('h3', 'skill-domain-card__title', domain.title);
  title.id = headingId;
  const header = createElement('div', 'skill-domain-card__header');
  header.append(
    icon,
    title,
    createElement('span', 'skill-domain-card__count', skillCountText(domain.skills.length))
  );

  const list = createElement('ul', 'skill-list');
  list.setAttribute('aria-labelledby', headingId);
  domain.skills.forEach((skill) => {
    const className = CJK_SKILL_PATTERN.test(skill.name)
      ? 'skill-item skill-item--cjk'
      : 'skill-item';
    const item = createElement('li', className, skill.name);
    item.dataset.skill = skill.name;
    list.appendChild(item);
  });

  card.append(header, list);
  return card;
}

/** @param {HTMLElement} container */
function syncOverflowTabIndex(container) {
  const hasFocus = container.matches(':focus-within');
  if (hasFocus || container.scrollWidth > container.clientWidth) {
    container.setAttribute('tabindex', '0');
  } else {
    container.removeAttribute('tabindex');
  }
}

function initSkillRadar() {
  const container = document.getElementById('skill-radar-grid');
  if (!container) return;
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', skillGridLabel());
  container.replaceChildren(
    ...Object.entries(resolveSkillData()).map(([domainKey, domain]) =>
      createDomainCard(domainKey, domain)
    )
  );
  syncOverflowTabIndex(container);
  container.addEventListener('focusout', () => syncOverflowTabIndex(container));
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => syncOverflowTabIndex(container)).observe(container);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', () => syncOverflowTabIndex(container), { passive: true });
  }
}

export { initSkillRadar };
