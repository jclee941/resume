/**
 * Career Incident Timeline Module
 * Incident Response Timeline visualization for resume.jclee.me
 *
 * Features:
 * - Vertical timeline with incident response metaphor
 * - Phase badges: 구축 | 운영 | 자동화 | 안정화 | 기초
 * - Active/Completed status indicators
 * - Expandable role cards with impact metrics
 * - Keyboard navigation & accessibility
 *
 * Phase progression: detected → investigated → mitigated → improved
 */

const TIMELINE_CONFIG = {
  scrollOffset: 80,
  animationDuration: 300,
  expandedClass: 'is-expanded',
  activeClass: 'is-active',
};

// Phase to incident response stage mapping
const PHASE_STAGES = {
  '운영': { icon: '🔍', label: '탐지', key: 'detected' },
  '구축': { icon: '🔬', label: '분석', key: 'investigated' },
  '자동화': { icon: '🛡️', label: '대응', key: 'mitigated' },
  '안정화': { icon: '✨', label: '개선', key: 'improved' },
  '기초': { icon: '⚙️', label: '기반', key: 'foundation' },
};

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
 * Get career data from the page data attribute or use static fallback
 * @returns {Array<Object>}
 */
function getCareerData() {
  // Try to get from window.RESUME_DATA first (set by the page)
  const resumeData = window.RESUME_DATA?.resume || {};

  if (resumeData.careers && Array.isArray(resumeData.careers)) {
    return resumeData.careers;
  }

  // Fallback static data matching resume_data.json
  return [
    {
      company: '(주)아이티센 CTS',
      companyUrl: 'https://itcencts.com/',
      period: '2025.03 ~ 2026.02',
      role: '보안운영 엔지니어 (SOC/DevSecOps)',
      myRole: '넥스트레이드 매매체결시스템 보안운영SM',
      description: '넥스트레이드 금융 거래소 매매체결시스템의 보안 운영 체계를 SIEM 기반 탐지·대응 파이프라인으로 전환했습니다. Splunk ES 탐지 룰을 직접 설계·운영하여 보안 이벤트 탐지 범위를 확장하고, Splunk Saved Search → n8n webhook → Slack/SMS 연동 실시간 알림 파이프라인을 구축하여 이벤트 발생부터 담당자 인지까지의 지연을 단축했습니다.',
      achievements: [
        'SIEM 탐지·대응 파이프라인 구축',
        '자동화 실시간 알림 체계 운영',
      ],
      phase: '운영',
      status: 'active',
    },
    {
      company: '(주)가온누리정보시스템',
      companyUrl: 'http://www.gaonnuriis.com/',
      period: '2024.03 ~ 2025.02',
      role: '보안 인프라 엔지니어 (구축)',
      myRole: '금융 거래소 고가용성 보안 아키텍처 설계 및 FSC 본인가 대응',
      description: '넓스트레이드 매매체결시스템의 금융위 본인가 심사 기준을 충족하는 고가용성 보안 인프라를 설계·구축했습니다. FortiGate FGCP 액티브-패시브 HA를 구성하고, 금융권 규제에 맞는 5계층 망분리 보안 아키텍처를 설계·문서화하여 FSC 본인가 심사를 통과시켰습니다.',
      achievements: [
        '5계층 망분리 보안 아키텍처 설계',
        'FSC 본인가 심사 통과',
      ],
      phase: '구축',
      status: 'completed',
    },
    {
      company: '(주)콴텍투자일임',
      companyUrl: 'https://www.quantec.co.kr/',
      period: '2022.08 ~ 2024.03',
      role: '인프라 엔지니어 (FSDC/금융DC)',
      myRole: '금융보안데이터센터 인프라 운영 자동화 및 규제 감사 대응',
      description: '금융보안데이터센터(FSDC)에서 AI 트레이딩 플랫폼 인프라의 안정적 운영과 규제 대응 체계를 구축했습니다. 금융감독원 정기 감사에 필요한 DLP 정책 운영 체계와 감사 산출물 템플릿을 구축하여 반복되는 감사 대응을 재사용 가능한 프로세스로 전환했습니다.',
      achievements: [
        '금융감독원 감사 대응 체계 구축',
        'DB 튜닝으로 시스템 부하 개선',
      ],
      phase: '안정화',
      status: 'completed',
    },
    {
      company: '(주)조인트리',
      companyUrl: null,
      period: '2021.09 ~ 2022.04',
      role: '보안 엔지니어',
      myRole: '国民대 차세대 정보시스템 보안 구축',
      description: '国民대학교 차세대 정보시스템 보안 구축项目中，负责网络隔离和安全架构设计。',
      achievements: [
        'NSX-T 마이크로세그멘테이션 구현',
        '零信任 보안 아키텍처 설계',
      ],
      phase: '구축',
      status: 'completed',
    },
    {
      company: '(주)메타넷엠플랫폼',
      companyUrl: null,
      period: '2019.12 ~ 2021.08',
      role: '인프라 엔지니어',
      myRole: '대규모 컨택센터 인프라 운영',
      description: '대규모 컨택센터 인프라를 운영하며 반복적인 네트워크 장비 관리 작업을 자동화했습니다.',
      achievements: [
        'Ansible NAC 자동화 구축',
        '基础设施标准化完成',
      ],
      phase: '자동화',
      status: 'completed',
    },
    {
      company: '(주)엠티데이터',
      companyUrl: null,
      period: '2017.02 ~ 2018.10',
      role: 'IT 엔지니어',
      myRole: 'KAI 폐쇄망 IT 운영',
      description: 'KAI 폐쇄망 환경에서 IT 인프라 운영을 담당하며 Linux 시스템 관리와 네트워크 운영의 기반을 다졌습니다.',
      achievements: [
        'RHCPA 자격증 취득',
        'LPIC-1 자격증 취득',
        '리눅스마스터 2급 취득',
      ],
      phase: '기초',
      status: 'completed',
    },
  ];
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

  const timelineHTML = `
    <div class="incident-timeline" role="list" aria-label="Career incident response timeline">
      <div class="timeline-line" aria-hidden="true"></div>
      ${careers.map((career, index) => createTimelineNode(career, index)).join('')}
    </div>
  `;

  // Replace resume-list content with timeline
  existingList.innerHTML = timelineHTML;

  // Store reference to container
  timelineContainer = existingList.querySelector('.incident-timeline');

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
  const isActive = career.status === 'active';
  const statusClass = isActive ? 'status--active' : 'status--completed';
  const nodeClass = isActive ? 'timeline-node--active' : '';

  const achievements = career.achievements || [];
  const impactText = achievements.length > 0
    ? achievements.map(a => `• ${a}`).join('\n')
    : career.description.substring(0, 80) + '...';

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
          <div class="timeline-date" aria-label="근무 기간">
            <time>${career.period}</time>
          </div>
          <div class="timeline-badges">
            <span class="phase-badge phase-badge--${career.phase}" aria-label="단계: ${career.phase}">
              ${phaseInfo.icon} ${career.phase}
            </span>
            ${isActive ? '<span class="status-badge status-badge--active" aria-label="현재 진행 중">진행 중</span>' : ''}
          </div>
        </header>

        <div class="timeline-card" tabindex="-1">
          <h3 class="timeline-company">
            <a href="${career.companyUrl || '#'}" target="_blank" rel="noopener noreferrer"
               class="company-link">${career.company}</a>
          </h3>
          <p class="timeline-role">${career.role}</p>
          <p class="timeline-myrole">${career.myRole}</p>

          <div class="incident-stages" aria-label="인시던트 대응 단계">
            <span class="incident-stage" data-stage="detected" title="탐지">🔍</span>
            <span class="incident-stage" data-stage="investigated" title="분석">🔬</span>
            <span class="incident-stage" data-stage="mitigated" title="대응">🛡️</span>
            <span class="incident-stage ${isActive ? 'incident-stage--current' : ''}" data-stage="improved" title="개선">✨</span>
          </div>

          <div class="timeline-impact" aria-label="성과">
            <div class="impact-summary">
              <span class="impact-label">Impact:</span>
              <span class="impact-text">${impactText.split('\n')[0]}</span>
            </div>
          </div>

          <div class="timeline-details" aria-hidden="true">
            <p class="details-description">${career.description}</p>
            ${achievements.length > 0 ? `
              <ul class="details-achievements">
                ${achievements.map(a => `<li>${a}</li>`).join('')}
              </ul>
            ` : ''}
          </div>

          <button class="timeline-expand-btn" aria-expanded="false" aria-controls="details-${index}"
                  aria-label="상세 내용 ${career.company}">
            <span class="expand-text">상세 보기</span>
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
  nodes.forEach(node => {
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
  expandText.textContent = isExpanded ? '상세 보기' : '접기';

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