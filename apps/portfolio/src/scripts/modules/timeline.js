/**
 * Career Incident Timeline Module
 * Incident Response Timeline visualization for resume.jclee.me
 *
 * Features:
 * - Vertical timeline with incident response metaphor
 * - One compact phase badge per role
 * - Active/Completed status indicators
 * - Expandable role cards with impact metrics
 * - Keyboard navigation & accessibility
 *
 */

const TIMELINE_CONFIG = {
  scrollOffset: 80,
  animationDuration: 300,
  expandedClass: 'is-expanded',
  activeClass: 'is-active',
};

// UI label i18n. Career DATA (role/description) comes localized from the
// per-locale data_*.json via window.__RESUME_CHAT_DATA__; these are the
// structural UI labels localized by page lang.
function timelineLang() {
  const l = (document.documentElement.lang || 'ko').toLowerCase();
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('ja')) return 'ja';
  return 'ko';
}

const TIMELINE_LABELS = {
  ko: {
    period: '근무 기간',
    phase: '단계',
    impact: '성과',
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
    impact: 'Impact',
    detail: 'Details',
    expand: 'View details',
    collapse: 'Collapse',
    inProgress: 'In progress',
    inProgressAria: 'Currently in progress',
    phases: { 운영: 'Operate', 구축: 'Build', 자동화: 'Automate', 안정화: 'Stabilize', 기초: 'Foundation' },
  },
  ja: {
    period: '在籍期間',
    phase: 'フェーズ',
    impact: '成果',
    detail: '詳細',
    expand: '詳細を見る',
    collapse: '閉じる',
    inProgress: '進行中',
    inProgressAria: '現在進行中',
    phases: { 운영: '運用', 구축: '構築', 자동화: '自動化', 안정화: '安定化', 기초: '基礎' },
  },
};

function tl() {
  return TIMELINE_LABELS[timelineLang()] || TIMELINE_LABELS.ko;
}

// Phase to incident response stage mapping
const PHASE_STAGES = {
  운영: { icon: '🔍', label: '탐지', key: 'detected' },
  구축: { icon: '🔬', label: '분석', key: 'investigated' },
  자동화: { icon: '🛡️', label: '대응', key: 'mitigated' },
  안정화: { icon: '✨', label: '개선', key: 'improved' },
  기초: { icon: '⚙️', label: '기반', key: 'foundation' },
};

// UI-only metadata keyed by tenure period (locale-stable). The SSoT careers[]
// carries the DATA fields (company/period/role/...); phase and status are
// presentation concerns that do not belong in the SSoT, so they live here and
// are merged onto the build-injected career data at render time. Keyed by
// `period` (not `company`) because company names are localized per locale while
// the tenure period is identical across ko/en/ja.
const CAREER_UI_META = {
  '2025.03 ~ 2026.02': { phase: '운영', status: 'completed' },
  '2024.03 ~ 2025.02': { phase: '구축', status: 'completed' },
  '2022.08 ~ 2024.03': { phase: '안정화', status: 'completed' },
  '2021.09 ~ 2022.04': { phase: '구축', status: 'completed' },
  '2019.12 ~ 2021.08': { phase: '자동화', status: 'completed' },
  '2017.02 ~ 2018.10': { phase: '기초', status: 'completed' },
};
const DEFAULT_CAREER_UI_META = { phase: '기초', status: 'completed' };

// Module state
let timelineContainer = null;

/**
 * Initialize Timeline module
 * @returns {void}
 */
export function initCareerTimeline() {
  if (!isTimelineSectionPresent()) {
    console.warn('[CareerTimeline] Timeline section not found, skipping initialization.');
    return;
  }

  injectTimeline();
  attachEventListeners();

  console.log('[CareerTimeline] Initialized successfully.');
}

/**
 * Check if timeline section exists
 * @returns {boolean}
 */
function isTimelineSectionPresent() {
  return document.querySelector('.section-resume') !== null;
}

/**
 * Merge build-injected SSoT career DATA with UI-only presentation metadata.
 * Pure function (no globals) so it can be unit-tested in isolation.
 * @param {Array<Object>} careers - SSoT career entries from generated portfolio data.
 * @returns {Array<Object>} Render-ready career nodes with phase/status attached.
 */
export function mergeCareerUiMeta(careers) {
  if (!Array.isArray(careers)) return [];
  return careers.map((career) => {
    const meta = CAREER_UI_META[career.period] || DEFAULT_CAREER_UI_META;
    return { ...career, phase: career.phase || meta.phase, status: career.status || meta.status };
  });
}

/**
 * Get career data from the build-injected SSoT snapshot.
 *
 * The build pipeline base64-injects the full generated portfolio data into
 * window.__RESUME_CHAT_DATA__ (see apps/portfolio/lib/build-orchestrator.js +
 * html-transformer.js). Its `careers[]` is derived from the SSoT
 * (packages/data/resumes/master/resume_data.json) by
 * tools/scripts/utils/resume-web-data-generator.js, so there is no hardcoded
 * career content here to drift out of sync. UI-only phase/status are merged on.
 * @returns {Array<Object>}
 */
function getCareerData() {
  const injected = (typeof window !== 'undefined' && window.__RESUME_CHAT_DATA__) || {};
  const careers = Array.isArray(injected.careers) ? injected.careers : [];

  if (careers.length === 0) {
    console.warn(
      '[CareerTimeline] No careers found in __RESUME_CHAT_DATA__; rendering empty timeline.'
    );
    return [];
  }

  return mergeCareerUiMeta(careers);
}

/**
 * Inject timeline HTML into the DOM
 * @returns {void}
 */
function injectTimeline() {
  const resumeSection = document.querySelector('.section-resume');
  if (!resumeSection) return;

  const existingList = resumeSection.querySelector('.resume-list');
  if (!existingList) return;

  const careers = getCareerData();

  // Build the timeline as a standalone container. We REPLACE the <ul.resume-list>
  // wrapper entirely (instead of nesting a role="list" <div> inside a <ul>, which
  // violates WCAG list rules) so the role="list"/role="listitem" semantics are valid.
  const timeline = document.createElement('div');
  timeline.className = 'incident-timeline resume-list';
  timeline.setAttribute('role', 'list');
  timeline.setAttribute('aria-label', 'Career incident response timeline');
  timeline.innerHTML = `
    <div class="timeline-line" aria-hidden="true"></div>
    ${careers.map((career, index) => createTimelineNode(career, index)).join('')}
  `;

  // Swap the <ul> placeholder for the semantic timeline container.
  existingList.replaceWith(timeline);

  // Store reference to container
  timelineContainer = timeline;

  // Add staggered entrance animations
  requestAnimationFrame(() => {
    const nodes = timelineContainer.querySelectorAll('.timeline-node');
    nodes.forEach((node, i) => {
      node.style.animationDelay = `${i * 100}ms`;
      node.classList.add('timeline-node--animate');
    });
  });
}

/**
 * Create a single timeline node
 * @param {Object} career - Career data
 * @param {number} index - Node index
 * @returns {string} HTML string
 */
function createTimelineNode(career, index) {
  const phaseInfo = PHASE_STAGES[career.phase] || PHASE_STAGES['기초'];
  const L = tl();
  const isActive = career.status === 'active';
  const statusClass = isActive ? 'status--active' : 'status--completed';
  const nodeClass = isActive ? 'timeline-node--active' : '';

  const achievements = career.achievements || [];
  const description = career.description || '';
  let impactText;
  if (achievements.length > 0) {
    impactText = achievements.map((a) => `• ${a}`).join('\n');
  } else if (description) {
    impactText = `${description.substring(0, 80)}...`;
  } else {
    impactText = '';
  }

  return `
    <article class="timeline-node ${nodeClass}" role="listitem" tabindex="0"
             data-phase="${career.phase}"
             data-status="${career.status}"
             aria-label="${career.company} - ${career.period}">
      <div class="timeline-marker" aria-hidden="true">
        <div class="timeline-dot ${statusClass}"></div>
      </div>

      <div class="timeline-content">
        <header class="timeline-header">
          <div class="timeline-date" aria-label="${L.period}">
            <time>${career.period}</time>
          </div>
          <div class="timeline-badges">
            <span class="phase-badge phase-badge--${career.phase}" aria-label="${L.phase}: ${(L.phases && L.phases[career.phase]) || career.phase}">
              ${phaseInfo.icon} ${(L.phases && L.phases[career.phase]) || career.phase}
            </span>
            ${isActive ? `<span class="status-badge status-badge--active" aria-label="${L.inProgressAria}">${L.inProgress}</span>` : ''}
          </div>
        </header>

        <div class="timeline-card" tabindex="-1">
          <h3 class="timeline-company">
            <a href="${career.companyUrl || '#'}" target="_blank" rel="noopener noreferrer"
               class="company-link">${career.company}</a>
          </h3>
          <p class="timeline-role">${career.role}</p>
          <p class="timeline-myrole">${career.myRole}</p>

          <div class="timeline-impact" aria-label="${L.impact}">
            <div class="impact-summary">
              <span class="impact-label">${L.impact}:</span>
              <span class="impact-text">${impactText.split('\n')[0]}</span>
            </div>
          </div>

          <div class="timeline-details" aria-hidden="true">
            <p class="details-description">${description}</p>
            ${
              achievements.length > 0
                ? `
              <ul class="details-achievements">
                ${achievements.map((a) => `<li>${a}</li>`).join('')}
              </ul>
            `
                : ''
            }
          </div>

          <button class="timeline-expand-btn" aria-expanded="false" aria-controls="details-${index}"
                  aria-label="${L.detail} ${career.company}">
            <span class="expand-text">${L.expand}</span>
            <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Attach event listeners for interactive elements
 * @returns {void}
 */
function attachEventListeners() {
  if (!timelineContainer) return;

  // Expand/collapse buttons
  timelineContainer.addEventListener('click', handleTimelineClick);

  // Keyboard navigation
  timelineContainer.addEventListener('keydown', handleKeyboardNav);

  // Hover effects for quick stats (optional enhancement)
  const nodes = timelineContainer.querySelectorAll('.timeline-node');
  nodes.forEach((node) => {
    node.addEventListener('mouseenter', handleNodeHover);
    node.addEventListener('mouseleave', handleNodeLeave);
  });
}

/**
 * Handle click events on timeline nodes
 * @param {Event} event
 * @returns {void}
 */
function handleTimelineClick(event) {
  const expandBtn = event.target.closest('.timeline-expand-btn');
  if (!expandBtn) return;

  const card = expandBtn.closest('.timeline-card');
  const details = card.querySelector('.timeline-details');
  const node = card.closest('.timeline-node');

  const isExpanded = node.classList.contains(TIMELINE_CONFIG.expandedClass);

  // Toggle expanded state
  node.classList.toggle(TIMELINE_CONFIG.expandedClass);
  expandBtn.setAttribute('aria-expanded', !isExpanded);
  details.setAttribute('aria-hidden', isExpanded);

  // Update button text
  const expandText = expandBtn.querySelector('.expand-text');
  const L = tl();
  expandText.textContent = isExpanded ? L.expand : L.collapse;

  // Rotate icon
  const icon = expandBtn.querySelector('.expand-icon');
  icon.style.transform = isExpanded ? '' : 'rotate(180deg)';
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function handleKeyboardNav(event) {
  const node = event.target.closest('.timeline-node');
  if (!node) return;

  switch (event.key) {
    case 'Enter':
    case ' ':
      // Toggle expand on Enter/Space
      if (event.target.closest('.timeline-card')) {
        event.preventDefault();
        const expandBtn = node.querySelector('.timeline-expand-btn');
        if (expandBtn) expandBtn.click();
      }
      break;

    case 'ArrowDown':
    case 'ArrowRight':
      // Move to next node
      event.preventDefault();
      navigateToNode(node, 1);
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
      // Move to previous node
      event.preventDefault();
      navigateToNode(node, -1);
      break;

    case 'Home':
      // Move to first node
      event.preventDefault();
      const firstNode = timelineContainer?.querySelector('.timeline-node');
      firstNode?.focus();
      break;

    case 'End':
      // Move to last node
      event.preventDefault();
      const lastNode = timelineContainer?.querySelector('.timeline-node:last-child');
      lastNode?.focus();
      break;
  }
}

/**
 * Navigate to adjacent timeline node
 * @param {Element} currentNode
 * @param {number} direction
 * @returns {void}
 */
function navigateToNode(currentNode, direction) {
  if (!timelineContainer) return;

  const nodes = Array.from(timelineContainer.querySelectorAll('.timeline-node'));
  const currentIndex = nodes.indexOf(currentNode);
  const nextIndex = currentIndex + direction;

  if (nextIndex >= 0 && nextIndex < nodes.length) {
    nodes[nextIndex].focus();
  }
}

/**
 * Handle hover state for quick stats tooltip
 * @param {Event} event
 * @returns {void}
 */
function handleNodeHover(event) {
  const node = event.currentTarget;
  node.classList.add('is-hovered');
}

/**
 * Handle leave state
 * @param {Event} event
 * @returns {void}
 */
function handleNodeLeave(event) {
  const node = event.currentTarget;
  node.classList.remove('is-hovered');
}
