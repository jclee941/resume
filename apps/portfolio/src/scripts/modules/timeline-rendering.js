import { renderIcon } from './project-card-formatting.js';

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
    impact: '成果',
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

function impactTextFor(career) {
  const achievements = career.achievements || [];
  if (achievements.length > 0) return achievements.map((item) => `• ${item}`).join('\n');
  const description = career.description || '';
  return description ? `${description.substring(0, 80)}...` : '';
}

export function createTimelineNode(career, index) {
  const phaseInfo = PHASE_STAGES[career.phase] || PHASE_STAGES['기초'];
  const labels = getTimelineLabels();
  const isActive = career.status === 'active';
  const statusClass = isActive ? 'status--active' : 'status--completed';
  const nodeClass = isActive ? 'timeline-node--active' : '';
  const achievements = career.achievements || [];
  const description = career.description || '';
  const phaseLabel = (labels.phases && labels.phases[career.phase]) || career.phase;
  const impactText = impactTextFor(career);

  const companyName = career.companyUrl
    ? `<a href="${career.companyUrl}" target="_blank" rel="noopener noreferrer"
               class="company-link">${career.company}</a>`
    : `<span class="company-link company-link--text">${career.company}</span>`;

  return `
    <li class="timeline-node ${nodeClass}" role="listitem" tabindex="0"
             data-phase="${career.phase}"
             data-status="${career.status}"
             aria-label="${career.company} - ${career.period}">
      <div class="timeline-marker" aria-hidden="true">
        <div class="timeline-dot ${statusClass}"></div>
      </div>

      <div class="timeline-content">
        <header class="timeline-header">
          <div class="timeline-date">
            <time>${career.period}</time>
          </div>
          <div class="timeline-badges">
            <span class="phase-badge phase-badge--${career.phase}" aria-label="${labels.phase}: ${phaseLabel}">
              ${renderIcon(phaseInfo.icon, 'phase-badge__icon')} ${phaseLabel}
            </span>
            ${isActive ? `<span class="status-badge status-badge--active" aria-label="${labels.inProgressAria}">${labels.inProgress}</span>` : ''}
          </div>
        </header>

        <div class="timeline-card" tabindex="-1">
          <h3 class="timeline-company">
            ${companyName}
          </h3>
          <p class="timeline-role">${career.role}</p>
          <p class="timeline-myrole">${career.myRole}</p>

          <div class="timeline-impact">
            <div class="impact-summary">
              <span class="impact-label">${labels.impact}:</span>
              <span class="impact-text">${impactText.split('\n')[0]}</span>
            </div>
          </div>

          <div id="details-${index}" class="timeline-details" aria-hidden="true">
            <p class="details-description">${description}</p>
            ${
              achievements.length > 0
                ? `
              <ul class="details-achievements">
                ${achievements.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            `
                : ''
            }
          </div>

          <button class="timeline-expand-btn" aria-expanded="false" aria-controls="details-${index}"
                  aria-label="${labels.expand} ${labels.detail} ${career.company}">
            <span class="expand-text">${labels.expand}</span>
            <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </li>
  `;
}
