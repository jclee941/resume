/**
 * Skill Radar Module
 * Interactive capability matrix with domain cards, tier labels, and evidence drawer
 */

import { createIconElement } from './project-card-formatting.js';
import { resolveSkillData } from './skill-radar-data.js';

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

const LEVELS = {
  primary: { min: 90, label: 'Primary', color: 'var(--color-accent-strong)' },
  applied: { min: 70, label: 'Applied', color: 'var(--color-accent)' },
  working: { min: 50, label: 'Working', color: 'var(--text-secondary)' },
};

function getLevelInfo(level) {
  if (level >= LEVELS.primary.min) return LEVELS.primary;
  if (level >= LEVELS.applied.min) return LEVELS.applied;
  return LEVELS.working;
}

function getTierLabel(level) {
  return getLevelInfo(level).label;
}

function createSkillRadar() {
  const container = document.getElementById('skill-radar-grid');
  if (!container) return;

  container.replaceChildren();
  Object.entries(resolveSkillData()).forEach(([domainKey, domain]) => {
    const card = createDomainCard(domainKey, domain);
    container.appendChild(card);
  });

  // CSP-safe styling: the templates emit inert data-* attributes (no inline
  // style="" which the strict style-src would block). Translate them into
  // CSSOM custom properties here — CSSOM writes are NOT subject to style-src.
  applyRadarStyles(container);
}

/**
 * Apply dynamic colors / bar widths via the CSSOM (allowed under strict CSP),
 * reading the inert data-* attributes set by the HTML templates.
 * @param {ParentNode} root
 */
function applyRadarStyles(root) {
  root.querySelectorAll('[data-level-color]').forEach((el) => {
    const color = el.getAttribute('data-level-color');
    if (!color) return;
    // Domain level indicator uses a custom prop; the per-skill level label
    // colors its own text. Set both safely; unused one is harmless.
    el.style.setProperty('--level-color', color);
    if (el.classList.contains('skill-item__level')) {
      el.style.color = color;
    }
  });
}

function createDomainCard(domainKey, domain) {
  const card = document.createElement('div');
  card.className = 'skill-domain-card';
  card.dataset.domain = domainKey;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');
  card.setAttribute('aria-controls', `skill-panel-${domainKey}`);

  const levelInfo = getLevelInfo(domain.skills[0].level);
  const tierLabel = getTierLabel(domain.skills[0].level);
  card.setAttribute('aria-label', `${domain.title}: ${tierLabel}, ${domain.skills.length} skills`);

  const header = createElement('div', 'skill-domain-card__header');
  const icon = createElement('div', 'skill-domain-card__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.appendChild(createSkillDomainIcon(domainKey));
  const info = createElement('div', 'skill-domain-card__info');
  info.append(
    createElement('h3', 'skill-domain-card__title', domain.title),
    createElement('span', 'skill-domain-card__count', `${domain.skills.length} skills`)
  );
  const expand = createElement('div', 'skill-domain-card__expand');
  expand.setAttribute('aria-hidden', 'true');
  expand.appendChild(createIconElement('layers'));
  header.append(icon, info, expand);

  const indicator = createElement('div', 'skill-domain-card__level-indicator');
  indicator.dataset.levelColor = levelInfo.color;
  indicator.setAttribute('aria-label', tierLabel);
  indicator.append(
    createElement('span', 'skill-domain-card__level-dot'),
    createElement('span', 'skill-domain-card__level-label', tierLabel)
  );

  const panel = createSkillPanel(domainKey, domain);
  card.append(header, indicator, panel);

  card.addEventListener('click', () => toggleCard(card));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(card);
    }
  });

  return card;
}

function createSkillPanel(domainKey, domain) {
  const panel = document.createElement('div');
  panel.id = `skill-panel-${domainKey}`;
  panel.className = 'skill-panel';
  panel.hidden = true;

  const content = createElement('div', 'skill-panel__content');
  const skillList = createElement('ul', 'skill-list');
  skillList.setAttribute('role', 'list');
  domain.skills.forEach((skill) => skillList.appendChild(createSkillItem(skill)));

  const drawer = createElement('div', 'skill-evidence-drawer');
  const drawerTitle = createElement('h4', 'skill-evidence-drawer__title');
  drawerTitle.append(createIconElement('database'), document.createTextNode(' Evidence'));
  const evidenceList = createElement('ul', 'skill-evidence-list');
  evidenceList.setAttribute('role', 'list');
  domain.skills.forEach((skill) => evidenceList.appendChild(createEvidenceItem(skill)));
  drawer.append(drawerTitle, evidenceList);
  content.append(skillList, drawer);
  panel.appendChild(content);

  return panel;
}

function createSkillItem(skill) {
  const levelInfo = getLevelInfo(skill.level);
  const item = createElement('li', 'skill-item');
  item.dataset.skill = skill.name;
  item.dataset.level = String(skill.level);
  const header = createElement('div', 'skill-item__header');
  const level = createElement('span', 'skill-item__level', getTierLabel(skill.level));
  level.dataset.levelColor = levelInfo.color;
  header.append(createElement('span', 'skill-item__name', skill.name), level);
  item.appendChild(header);
  return item;
}

function createEvidenceItem(skill) {
  const item = createElement('li', 'skill-evidence-item');
  item.dataset.skill = skill.name;
  item.append(
    createElement('span', 'skill-evidence-item__name', skill.name),
    createElement('p', 'skill-evidence-item__text', skill.evidence)
  );
  return item;
}

function createSkillDomainIcon(domainKey) {
  const icons = {
    backendApi: 'server',
    cicdAutomation: 'sync',
    cloudEdge: 'cloud',
    infrastructureAsCode: 'code',
    observability: 'chart',
    securityAutomation: 'shield',
  };
  return createIconElement(icons[domainKey] || 'layers');
}

function toggleCard(card) {
  const isExpanded = card.getAttribute('aria-expanded') === 'true';
  const panel = card.querySelector('.skill-panel');
  const expandIcon = card.querySelector('.skill-domain-card__expand svg');

  if (isExpanded) {
    card.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    expandIcon.style.transform = '';
  } else {
    card.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    expandIcon.style.transform = 'rotate(180deg)';
  }
}

function filterSkills(searchTerm) {
  const cards = document.querySelectorAll('.skill-domain-card');
  const skillItems = document.querySelectorAll('.skill-item');
  const evidenceItems = document.querySelectorAll('.skill-evidence-item');
  let matchCount = 0;

  const normalizedSearch = searchTerm.toLowerCase().trim();

  cards.forEach((card) => {
    const domain = card.dataset.domain;
    const domainData = resolveSkillData()[domain];
    const skillNames = domainData.skills.map((s) => s.name.toLowerCase());
    const domainTitle = domainData.title.toLowerCase();

    const matchesDomain =
      !normalizedSearch ||
      domainTitle.includes(normalizedSearch) ||
      skillNames.some((name) => name.includes(normalizedSearch));

    card.style.display = matchesDomain ? '' : 'none';

    if (matchesDomain) {
      skillItems.forEach((item) => {
        const skillName = item.dataset.skill.toLowerCase();
        const matchesSkill = !normalizedSearch || skillName.includes(normalizedSearch);
        item.style.display = matchesSkill ? '' : 'none';
        if (matchesSkill && matchesDomain) matchCount++;
      });

      evidenceItems.forEach((item) => {
        const skillName = item.dataset.skill.toLowerCase();
        const matchesEvidence = !normalizedSearch || skillName.includes(normalizedSearch);
        item.style.display = matchesEvidence ? '' : 'none';
      });
    }
  });

  updateMatchCount(matchCount);
}

function updateMatchCount(count) {
  const counter = document.getElementById('skill-search-count');
  if (counter) {
    counter.textContent = `${count} skill${count !== 1 ? 's' : ''} found`;
    counter.style.display = count > 0 ? '' : 'none';
  }
}

function initSkillSearch() {
  const searchInput = document.getElementById('skill-search-input');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterSkills(e.target.value);
    }, 150);
  });

  searchInput.addEventListener('clear', () => {
    filterSkills('');
  });
}

function initSkillRadar() {
  createSkillRadar();
  initSkillSearch();
}

export { initSkillRadar };
