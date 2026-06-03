/**
 * Skill Radar Module
 * Interactive capability matrix with domain cards, tier labels, and evidence drawer
 */

// Escape HTML so build-time-injected SSoT skill data can never inject markup
// when written via innerHTML. Mirrors lib/template-sanitizer escapeHtml.
function escapeHtml(unsafe) {
  return String(unsafe == null ? '' : unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SKILL_DATA_FALLBACK = {
  securityAutomation: {
    title: 'Security Automation',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    skills: [
      {
        name: 'Splunk ES (SIEM/SOAR)',
        level: 95,
        evidence: 'Designed custom detection rules, automated response pipeline',
      },
      {
        name: 'FortiGate/FortiManager',
        level: 90,
        evidence: 'Designed and operated firewall policies for financial enterprise',
      },
      {
        name: 'NSX-T Microsegmentation',
        level: 75,
        evidence: 'Implemented zero-trust microsegmentation in vSphere environment',
      },
      {
        name: 'Wazuh (EDR)',
        level: 80,
        evidence: 'Deployed EDR solution with custom detection rules',
      },
      {
        name: 'NAC/DLP',
        level: 70,
        evidence: 'Configured network access control and data loss prevention',
      },
    ],
  },
  cloudEdge: {
    title: 'Cloud & Edge',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    skills: [
      {
        name: 'Cloudflare Workers',
        level: 90,
        evidence: 'Portfolio deployed on Workers, edge-optimized rendering',
      },
      {
        name: 'Cloudflare Pages',
        level: 85,
        evidence: 'Static assets served via Pages with edge functions',
      },
      {
        name: 'Terraform',
        level: 85,
        evidence: 'IaC managed via Terraform for cloud infrastructure',
      },
    ],
  },
  observability: {
    title: 'Observability',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    skills: [
      {
        name: 'Grafana',
        level: 90,
        evidence: 'Built monitoring stack on Synology NAS, public dashboards',
      },
      {
        name: 'Prometheus',
        level: 85,
        evidence: 'Metrics collection and alerting for infrastructure',
      },
      {
        name: 'Splunk Dashboards',
        level: 88,
        evidence: 'Custom SPL queries and executive dashboards',
      },
    ],
  },
  infrastructureAsCode: {
    title: 'Infrastructure as Code',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18 22 12 16 6"/><path d="M8 6 2 12 8 18"/></svg>',
    skills: [
      { name: 'Terraform', level: 85, evidence: 'Standardized firewall configs with Ansible Role' },
      {
        name: 'Ansible',
        level: 82,
        evidence: 'Automated configuration management across the node fleet',
      },
      {
        name: 'Docker',
        level: 78,
        evidence: 'Containerized applications for local development and CI/CD',
      },
    ],
  },
  cicdAutomation: {
    title: 'CI/CD & Automation',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    skills: [
      {
        name: 'GitHub Actions',
        level: 88,
        evidence: 'Automated resume sync to JobKorea, CI/CD pipelines',
      },
      {
        name: 'n8n',
        level: 85,
        evidence: 'Workflow automation for job applications and data sync',
      },
      {
        name: 'Python scripting',
        level: 82,
        evidence: 'Custom automation scripts for data processing',
      },
    ],
  },
  backendApi: {
    title: 'Backend & API',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    skills: [
      { name: 'Node.js', level: 80, evidence: 'Built API clients for job portal automation' },
      { name: 'Python', level: 85, evidence: 'Backend services and automation scripts' },
      { name: 'PostgreSQL', level: 78, evidence: 'DB query tuning and schema design' },
    ],
  },
};

// Build-time injected real skills from data.json (esbuild `define` replaces the
// __SKILL_DATA__ token). This bundle is shared across locales, so it always
// carries the Korean SSoT copy. When the page injects locale-correct skills via
// window.__RESUME_CHAT_DATA__.skills (KO/EN/JA), prefer those and reuse the
// build-injected radar icons (keyed by category) so the radar matches the page
// language. Falls back to the static copy when nothing is injected.
const SKILL_DATA_INJECTED =
  typeof __SKILL_DATA__ !== 'undefined' && __SKILL_DATA__ && Object.keys(__SKILL_DATA__).length > 0
    ? __SKILL_DATA__
    : SKILL_DATA_FALLBACK;

const RADAR_LEVEL_MAP = { expert: 95, advanced: 80, intermediate: 60, beginner: 35 };

// Transform the raw SSoT skills shape (title/icon/items[{name,level:string}])
// into the radar shape (skills[{name,level:0-100,evidence}]), borrowing the
// inline SVG icon from the build-injected radar data for the same category.
function radarFromLocaleSkills(skills) {
  if (!skills || typeof skills !== 'object') return null;
  const out = {};
  for (const [category, data] of Object.entries(skills)) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) continue;
    const injected = SKILL_DATA_INJECTED[category];
    out[category] = {
      title: String(data.title || category),
      icon: (injected && injected.icon) || (SKILL_DATA_FALLBACK[category] && SKILL_DATA_FALLBACK[category].icon) || '',
      skills: data.items.map((item) => {
        const levelKey = String(item.level || 'intermediate').toLowerCase();
        return {
          name: String(item.name || 'Unknown'),
          level: RADAR_LEVEL_MAP[levelKey] != null ? RADAR_LEVEL_MAP[levelKey] : 60,
          evidence: `${levelKey.charAt(0).toUpperCase()}${levelKey.slice(1)} proficiency`,
        };
      }),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

function resolveSkillData() {
  const injected =
    typeof window !== 'undefined' && window.__RESUME_CHAT_DATA__
      ? window.__RESUME_CHAT_DATA__.skills
      : null;
  return radarFromLocaleSkills(injected) || SKILL_DATA_INJECTED;
}

const LEVELS = {
  expert: { min: 90, label: 'Expert', color: 'var(--color-accent-strong)' },
  advanced: { min: 70, label: 'Advanced', color: 'var(--color-accent)' },
  intermediate: { min: 50, label: 'Intermediate', color: 'var(--text-secondary)' },
};

function getLevelInfo(level) {
  if (level >= LEVELS.expert.min) return LEVELS.expert;
  if (level >= LEVELS.advanced.min) return LEVELS.advanced;
  return LEVELS.intermediate;
}

function getTierLabel(level) {
  const info = getLevelInfo(level);
  if (info.label === 'Expert') return 'Core';
  if (info.label === 'Advanced') return 'Strong working';
  return 'Learning';
}

function createSkillRadar() {
  const container = document.getElementById('skill-radar-grid');
  if (!container) return;

  container.innerHTML = '';
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
  const article = document.createElement('article');
  article.className = 'skill-domain-card';
  article.dataset.domain = domainKey;
  article.setAttribute('tabindex', '0');
  article.setAttribute('role', 'button');
  article.setAttribute('aria-expanded', 'false');
  article.setAttribute('aria-controls', `skill-panel-${domainKey}`);

  const levelInfo = getLevelInfo(domain.skills[0].level);

  article.innerHTML = `
    <div class="skill-domain-card__header">
      <div class="skill-domain-card__icon" aria-hidden="true">${domain.icon}</div>
      <div class="skill-domain-card__info">
        <h3 class="skill-domain-card__title">${escapeHtml(domain.title)}</h3>
        <span class="skill-domain-card__count">${domain.skills.length} skills</span>
      </div>
      <div class="skill-domain-card__expand" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
    <div class="skill-domain-card__level-indicator" data-level-color="${levelInfo.color}" aria-label="${getTierLabel(domain.skills[0].level)}">
      <span class="skill-domain-card__level-dot"></span>
      <span class="skill-domain-card__level-label">${getTierLabel(domain.skills[0].level)}</span>
    </div>
  `;

  const panel = createSkillPanel(domainKey, domain);
  article.appendChild(panel);

  article.addEventListener('click', () => toggleCard(article));
  article.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(article);
    }
  });

  return article;
}

function createSkillPanel(domainKey, domain) {
  const panel = document.createElement('div');
  panel.id = `skill-panel-${domainKey}`;
  panel.className = 'skill-panel';
  panel.hidden = true;

  panel.innerHTML = `
    <div class="skill-panel__content">
      <ul class="skill-list" role="list">
        ${domain.skills.map((skill) => createSkillItem(skill)).join('')}
      </ul>
      <div class="skill-evidence-drawer">
        <h4 class="skill-evidence-drawer__title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Evidence
        </h4>
        <ul class="skill-evidence-list" role="list">
          ${domain.skills
            .map(
              (skill) => `
            <li class="skill-evidence-item" data-skill="${escapeHtml(skill.name)}">
              <span class="skill-evidence-item__name">${escapeHtml(skill.name)}</span>
              <p class="skill-evidence-item__text">${escapeHtml(skill.evidence)}</p>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    </div>
  `;

  return panel;
}

function createSkillItem(skill) {
  const levelInfo = getLevelInfo(skill.level);
  return `
    <li class="skill-item" data-skill="${escapeHtml(skill.name)}" data-level="${skill.level}">
      <div class="skill-item__header">
        <span class="skill-item__name">${escapeHtml(skill.name)}</span>
        <span class="skill-item__level" data-level-color="${levelInfo.color}">${getTierLabel(skill.level)}</span>
      </div>
    </li>
  `;
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

function initSkillRadarScrollAnimation() {
  return;
}

function initSkillRadar() {
  createSkillRadar();
  initSkillSearch();
  initSkillRadarScrollAnimation();

  document.querySelectorAll('.skill-domain-card[aria-expanded="true"]').forEach((card) => {
    animateSkillBars(card);
  });
}

export { initSkillRadar };
