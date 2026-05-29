/**
 * Project Deep-Dive Cards Module
 * Interactive project cards with technical evidence
 */

const PROJECTS = [
  {
    id: 'nexttrade-security-ops',
    title: '넥스트레이드 매매체결시스템 보안 운영',
    period: '2025.03 ~ 2026.02',
    icon: '🛡️',
    stack: ['Splunk', 'n8n', 'FortiManager', 'Python', 'Docker'],
    metrics: [
      { value: 'Custom', label: 'Detection Rules', icon: '🔍' },
      { value: 'Continuous', label: 'Monitoring', icon: '👁️' },
      { value: 'Realtime', label: 'Alerting', icon: '⚡' },
    ],
    description:
      '금융 거래소 매매체결시스템의 보안 운영 체계를 SIEM 기반 탐지·대응 파이프라인으로 전환했습니다.',
    achievements: [
      'Splunk ES 탐지 룰 직접 설계·운영',
      'Saved Search → n8n webhook → Slack/SMS 실시간 알림 파이프라인 구축',
      'FortiManager API 연동 자동화',
      '보안 이벤트 탐지 범위 확장',
    ],
    architecture: `┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Splunk ES   │───▶│ n8n         │───▶│ Slack/SMS   │
│ (Detection) │    │ (Automation)│    │ (Alert)     │
└─────────────┘    └─────────────┘    └─────────────┘
       │
       ▼
┌─────────────┐
│ FortiManager│
│ (Response)  │
└─────────────┘`,
    tools: [
      { icon: '🔍', name: 'Splunk ES' },
      { icon: '⚡', name: 'n8n' },
      { icon: '🧱', name: 'FortiManager' },
      { icon: '🐍', name: 'Python' },
      { icon: '🐳', name: 'Docker' },
    ],
  },
  {
    id: 'nexttrade-infra-build',
    title: '넥스트레이드 보안 인프라 구축',
    period: '2024.03 ~ 2025.02',
    icon: '🏗️',
    stack: ['FortiGate', 'Ansible', 'VMware'],
    metrics: [
      { value: 'Layered', label: 'Network Segmentation', icon: '📶' },
      { value: 'HA', label: 'Firewall Cluster', icon: '🔄' },
      { value: 'FSC', label: 'Approval Passed', icon: '✅' },
    ],
    description:
      '거래소 보안 인프라를 5계층 망분리 구조로 설계·구축하여 FSC 본인가를 통과했습니다.',
    achievements: [
      '5계층 망분리 아키텍처 설계·구축',
      'FortiGate HA 클러스터 구성',
      '방화벽 정책 표준화 및 자동화',
      'FSC 본인가 통과',
    ],
    architecture: `┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  DMZ    │───▶│  WAS    │───▶│  API    │───▶│  DB     │───▶│  Admin  │
│ (Web)   │    │ (App)   │    │ (Gateway)│   │ (Core)  │    │ (Mgmt)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │                                                           │
     └─────────────────────▶ FortiGate HA ◀──────────────────────┘`,
    tools: [
      { icon: '🧱', name: 'FortiGate' },
      { icon: '🤖', name: 'Ansible' },
      { icon: '💻', name: 'VMware' },
    ],
  },
  {
    id: 'fsdc-trading-platform',
    title: 'FSDC AI 트레이딩 플랫폼 인프라',
    period: '2022.08 ~ 2024.03',
    icon: '📈',
    stack: ['PostgreSQL', 'Python', 'AWS'],
    metrics: [
      { value: 'Tuned', label: 'Query Speed', icon: '🚀' },
      { value: 'Clean', label: 'Audit Findings', icon: '✅' },
      { value: 'HA', label: 'Availability', icon: '📊' },
    ],
    description:
      'AI 기반 트레이딩 플랫폼의 데이터베이스 인프라를 운영하고 금융감독원 감사에 대응했습니다.',
    achievements: [
      'PostgreSQL DB 튜닝으로 쿼리 성능 개선',
      '금융감독원 정기 감사 대응 체계 운영',
      '백업·복구 체계 구축',
      '인프라 모니터링 체계 운영',
    ],
    architecture: `┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Traders    │───▶│  API Server │───▶│  PostgreSQL │
│  (Clients)  │    │  (Python)   │    │  (Primary)  │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                              │
                                         ┌────┴────┐
                                         │ Replica │
                                         │ (Standby)│
                                         └─────────┘`,
    tools: [
      { icon: '🐘', name: 'PostgreSQL' },
      { icon: '🐍', name: 'Python' },
      { icon: '☁️', name: 'AWS' },
    ],
  },
  {
    id: 'kookmin-university-infra',
    title: '국민대 차세대 정보시스템',
    period: '2021.09 ~ 2022.04',
    icon: '🎓',
    stack: ['NSX-T', 'VMware', 'Wazuh'],
    metrics: [
      { value: 'Full', label: 'East-West Coverage', icon: '📡' },
      { value: 'Full', label: 'Visibility Coverage', icon: '👁️' },
      { value: 'Micro', label: 'Segmentation', icon: '🧩' },
    ],
    description:
      '국민대학교 차세대 정보시스템 보안 구축에서 NSX-T 마이크로세그멘테이션을 도입하여 동서 트래픽 사각지대를 해소했습니다.',
    achievements: [
      'NSX-T 마이크로세그멘테이션 도입',
      '동서 트래픽 가시성 확보',
      'Wazuh 기반 엔드포인트 보안 모니터링',
      'VMware vSphere 인프라 구축',
    ],
    architecture: `┌─────────┐     ┌─────────┐     ┌─────────┐
│  Web    │────▶│  App    │────▶│  DB     │
│  Tier   │     │  Tier   │     │  Tier   │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
              ┌──────┴──────┐
              │  NSX-T      │
              │  Micro-Seg  │
              │  (Firewall) │
              └─────────────┘`,
    tools: [
      { icon: '🔀', name: 'NSX-T' },
      { icon: '💻', name: 'VMware' },
      { icon: '🔍', name: 'Wazuh' },
    ],
  },
];

let overlay = null;
let isOpen = false;

export function initProjectCards() {
  const projectList = document.querySelector('.project-list');
  if (!projectList) {
    console.warn('[ProjectCards] .project-list not found');
    return;
  }

  // Replace project list with card grid
  const grid = document.createElement('div');
  grid.className = 'project-cards-grid';
  grid.setAttribute('role', 'list');
  const _pl = (document.documentElement.lang || 'ko').toLowerCase();
  grid.setAttribute('aria-label', _pl.startsWith('en') ? 'Project list' : _pl.startsWith('ja') ? 'プロジェクト一覧' : '프로젝트 목록');

  PROJECTS.forEach((project, index) => {
    const card = createProjectCard(project, index);
    grid.appendChild(card);
  });

  projectList.replaceWith(grid);

  // Create overlay container
  createOverlay();

  // Animate cards in
  requestAnimationFrame(() => {
    const cards = grid.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('animate-in'), i * 100);
    });
  });

  // Keyboard handler
  document.addEventListener('keydown', handleKeydown);

  console.log('[ProjectCards] Initialized');
}

function createProjectCard(project, index) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('data-project-id', project.id);
  card.style.animationDelay = `${index * 0.1}s`;

  card.innerHTML = `
    <div class="project-card__header">
      <div class="project-card__icon">${project.icon}</div>
      <div class="project-card__title-group">
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <div class="project-card__period">${escapeHtml(project.period)}</div>
      </div>
    </div>
    <div class="project-card__stack">
      ${project.stack.map((tech) => `<span class="tech-tag tech-tag--${getTechClass(tech)}">${escapeHtml(tech)}</span>`).join('')}
    </div>
    <div class="project-card__metrics">
      ${project.metrics
        .map(
          (m) => `
        <div class="metric-preview">
          <span class="metric-preview__icon">${m.icon}</span>
          <span class="metric-preview__value">${escapeHtml(m.value)} ${escapeHtml(m.label)}</span>
        </div>
      `
        )
        .join('')}
    </div>
    <div class="project-card__cta">
      <span>Deep Dive</span>
      <span class="project-card__cta-icon">→</span>
    </div>
  `;

  card.addEventListener('click', () => openDeepDive(project));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDeepDive(project);
    }
  });

  return card;
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'deep-dive-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '프로젝트 상세 정보');
  overlay.innerHTML = `
    <div class="deep-dive-panel">
      <button class="deep-dive-close" aria-label="닫기">×</button>
      <div class="deep-dive-content" id="deep-dive-content"></div>
      <div class="keyboard-hint">
        <span class="key-hint"><span class="key-hint__key">ESC</span> 닫기</span>
        <span class="key-hint"><span class="key-hint__key">Tab</span> 탐색</span>
      </div>
    </div>
  `;

  overlay.querySelector('.deep-dive-close').addEventListener('click', closeDeepDive);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDeepDive();
  });

  document.body.appendChild(overlay);
}

function openDeepDive(project) {
  if (!overlay) return;

  const content = overlay.querySelector('#deep-dive-content');
  content.innerHTML = `
    <div class="deep-dive-header">
      <div class="deep-dive-header__icon">${project.icon}</div>
      <div class="deep-dive-header__content">
        <h2 class="deep-dive-header__title">${escapeHtml(project.title)}</h2>
        <div class="deep-dive-header__period">${escapeHtml(project.period)}</div>
        <div class="deep-dive-header__tags">
          ${project.stack.map((tech) => `<span class="tech-tag tech-tag--${getTechClass(tech)}">${escapeHtml(tech)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="deep-dive-content">
      <div class="deep-dive-section">
        <h3 class="deep-dive-section__title">개요</h3>
        <p class="project-detail__description">${escapeHtml(project.description)}</p>
      </div>
      <div class="deep-dive-section">
        <h3 class="deep-dive-section__title">주요 성과</h3>
        <ul class="achievements-list">
          ${project.achievements
            .map(
              (a) => `
            <li class="achievements-list__item">
              <span class="achievements-list__check">✓</span>
              <span class="achievements-list__text">${escapeHtml(a)}</span>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
      <div class="deep-dive-section">
        <h3 class="deep-dive-section__title">메트릭스</h3>
        <div class="metrics-grid">
          ${project.metrics
            .map(
              (m) => `
            <div class="metric-card">
              <div class="metric-card__value" data-target="${escapeHtml(m.value)}">${escapeHtml(m.value)}</div>
              <div class="metric-card__label">${escapeHtml(m.label)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      <div class="deep-dive-section">
        <h3 class="deep-dive-section__title">아키텍처</h3>
        <div class="architecture-diagram">
          <pre class="architecture-diagram__text">${escapeHtml(project.architecture)}</pre>
        </div>
      </div>
      <div class="deep-dive-section">
        <h3 class="deep-dive-section__title">사용 도구</h3>
        <div class="tools-grid">
          ${project.tools.map((t) => `<div class="tool-item"><span class="tool-item__icon">${t.icon}</span><span>${escapeHtml(t.name)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  isOpen = true;
  document.body.style.overflow = 'hidden';

  // Focus trap
  const closeBtn = overlay.querySelector('.deep-dive-close');
  if (closeBtn) closeBtn.focus();

  // Animate metrics
  setTimeout(() => {
    const metricValues = overlay.querySelectorAll('.metric-card__value');
    metricValues.forEach((el) => {
      el.classList.add('animate-counter');
    });
  }, 400);
}

function closeDeepDive() {
  if (!overlay || !isOpen) return;
  overlay.classList.remove('active');
  isOpen = false;
  document.body.style.overflow = '';
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    closeDeepDive();
  }
}

function getTechClass(tech) {
  const map = {
    Splunk: 'splunk',
    n8n: 'n8n',
    FortiManager: 'fortimanager',
    Python: 'python',
    Docker: 'docker',
    FortiGate: 'fortigate',
    Ansible: 'ansible',
    VMware: 'vmware',
    PostgreSQL: 'postgresql',
    AWS: 'aws',
    'NSX-T': 'nsx',
    Wazuh: 'wazuh',
  };
  return map[tech] || '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
