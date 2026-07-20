const { escapeHtml } = require('../template-sanitizer');
const {
  FEATURED_PROJECT_IDS,
  assertFeaturedProjectContract,
  buildProjectEvidence,
} = require('./project-evidence');

const PROJECT_LABELS = {
  ko: {
    railEyebrow: '핵심 프로젝트',
    railTitle: '풀스택 구현 사례',
    railDesc: ['제품 UI·API·데이터부터', '배포·운영까지 연결했습니다.'],
    open: '사례 보기',
    productUi: '제품 UI',
    backendApi: '백엔드·API',
    dataWorkflows: '데이터·워크플로',
    deliveryOperations: '배포·운영',
    securityReliability: '보안·신뢰성',
    evidence: '풀스택 역량 근거',
    architecture: '아키텍처 흐름',
  },
  en: {
    railEyebrow: 'Selected work',
    railTitle: 'End-to-end project work',
    railDesc: 'Three builds connecting product surfaces, APIs, data, delivery, and operations.',
    open: 'Open case',
    productUi: 'Product UI',
    backendApi: 'Backend & API',
    dataWorkflows: 'Data & Workflows',
    deliveryOperations: 'Delivery & Operations',
    securityReliability: 'Security & Reliability',
    evidence: 'Full-stack capability evidence',
    architecture: 'Architecture flow',
  },
  ja: {
    railEyebrow: '注目プロジェクト',
    railTitle: 'フルスタック開発事例',
    railDesc: [
      'プロダクトUI・API・データから',
      '配信・運用まで一貫して実装しました。',
    ],
    open: '事例を見る',
    productUi: 'プロダクトUI',
    backendApi: 'バックエンド・API',
    dataWorkflows: 'データ・ワークフロー',
    deliveryOperations: 'デリバリー・運用',
    securityReliability: 'セキュリティ・信頼性',
    evidence: 'フルスタック領域の根拠',
    architecture: 'アーキテクチャフロー',
  },
};

function detectLocale(projectsData) {
  const sample = projectsData.map((project) => project.description || '').join(' ');
  if (/[ぁ-ゟ゠-ヿ一-龯]/.test(sample)) return 'ja';
  if (/[가-힣]/.test(sample)) return 'ko';
  return 'en';
}

function projectLabelsFor(projectsData) {
  return PROJECT_LABELS[detectLocale(projectsData)];
}

function projectAnchor(project, index) {
  const id = project.id || project.title || `project-${index + 1}`;
  const slug = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ぁ-ゟ゠-ヿ一-龯]+/g, '-')
    .replace(/^-|-$/g, '');

  return `project-${slug || index + 1}`;
}

function buildProjectReviewRail(projects, labels) {
  if (projects.length < 3) {
    return '';
  }

  const featured = FEATURED_PROJECT_IDS.map((id) =>
    projects.find((candidate) => candidate.id === id)
  );
  const selected = featured.every(Boolean) ? featured : projects.slice(0, 3);
  const cards = selected.map((project, index) => {
    const anchor = projectAnchor(project, index);
    const summary = project.tagline || project.description || project.tech;
    return `<a class="project-review-rail__link" href="#${escapeHtml(anchor)}">
              <span>${escapeHtml(project.tagline || labels.open)}</span>
              <strong>${escapeHtml(project.title)}</strong>
              <small>${escapeHtml(summary)}</small>
            </a>`;
  });

  const railDescription = Array.isArray(labels.railDesc)
    ? labels.railDesc
        .map((part) => `<span>${escapeHtml(part)}</span>`)
        .join(' ')
    : escapeHtml(labels.railDesc);

  return `<li class="project-review-rail" aria-labelledby="project-review-rail-title">
            <p class="project-review-rail__eyebrow">${labels.railEyebrow}</p>
            <div class="project-review-rail__header">
              <h3 id="project-review-rail-title">${labels.railTitle}</h3>
              <p>${railDescription}</p>
            </div>
            <div class="project-review-rail__grid">${cards.join('')}</div>
          </li>`;
}

module.exports = {
  assertFeaturedProjectContract,
  buildProjectEvidence,
  buildProjectReviewRail,
  projectAnchor,
  projectLabelsFor,
};
