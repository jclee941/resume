const { escapeHtml } = require('../template-sanitizer');

const PROJECT_LABELS = {
  ko: {
    railEyebrow: '검토 경로',
    railTitle: '채용 검토용 프로젝트 빠른 경로',
    railDesc: '긴 목록을 훑기 전에 운영 근거가 가장 분명한 사례로 바로 이동할 수 있습니다.',
    problem: '문제',
    role: '역할',
    proof: '근거',
    review: '검토',
    open: '사례 보기',
    live: '운영 화면',
    repo: '저장소 근거',
    noLink: '상세 문맥',
    caseSummary: '프로젝트 사례 요약',
  },
  en: {
    railEyebrow: 'evidence route',
    railTitle: 'Fast paths for recruiter review',
    railDesc: 'Jump to the clearest operating evidence before scanning the full project list.',
    problem: 'Problem',
    role: 'Role',
    proof: 'Evidence',
    review: 'Review',
    open: 'Open case',
    live: 'Live view',
    repo: 'Code evidence',
    noLink: 'Context',
    caseSummary: 'Project case summary',
  },
  ja: {
    railEyebrow: 'レビュー経路',
    railTitle: '採用レビュー向けプロジェクト導線',
    railDesc: '長い一覧を読む前に、運用根拠が明確な事例へすぐ移動できます。',
    problem: '課題',
    role: '役割',
    proof: '根拠',
    review: '確認',
    open: '事例を見る',
    live: '運用画面',
    repo: 'コード根拠',
    noLink: '文脈',
    caseSummary: 'プロジェクト事例の要約',
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

function splitProjectSentences(description) {
  return String(description || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function projectReviewTarget(labels, githubUrl, demoUrl, dashboards) {
  if (dashboards.length > 0 || demoUrl) return labels.live;
  if (githubUrl) return labels.repo;
  return labels.noLink;
}

function buildProjectCaseNotes(project, labels, githubUrl, demoUrl, dashboards) {
  const sentences = splitProjectSentences(project.description);
  const problem = sentences[0] || project.tagline || project.title;
  const role = sentences[1] || project.tagline || project.tech;
  const proof = sentences[2] || project.tech || project.tagline || project.title;
  const review = projectReviewTarget(labels, githubUrl, demoUrl, dashboards);

  return `<dl class="project-case-notes" aria-label="${escapeHtml(project.title)} ${labels.caseSummary}">
              <div><dt>${labels.problem}</dt><dd>${escapeHtml(problem)}</dd></div>
              <div><dt>${labels.role}</dt><dd>${escapeHtml(role)}</dd></div>
              <div><dt>${labels.proof}</dt><dd>${escapeHtml(proof)}</dd></div>
              <div><dt>${labels.review}</dt><dd>${escapeHtml(review)}</dd></div>
          </dl>`;
}

function buildProjectReviewRail(projects, labels) {
  if (projects.length < 3) {
    return '';
  }

  const cards = projects.slice(0, 3).map((project, index) => {
    const anchor = projectAnchor(project, index);
    const summary = splitProjectSentences(project.description)[0] || project.tagline || project.tech;
    return `<a href="#${escapeHtml(anchor)}" class="project-review-rail__link">
              <span>${escapeHtml(project.tagline || labels.open)}</span>
              <strong>${escapeHtml(project.title)}</strong>
              <small>${escapeHtml(summary)}</small>
            </a>`;
  });

  return `<li class="project-review-rail" aria-labelledby="project-review-rail-title">
            <p class="project-review-rail__eyebrow">${labels.railEyebrow}</p>
            <div class="project-review-rail__header">
              <h3 id="project-review-rail-title">${labels.railTitle}</h3>
              <p>${labels.railDesc}</p>
            </div>
            <div class="project-review-rail__grid">${cards.join('')}</div>
          </li>`;
}

module.exports = {
  buildProjectCaseNotes,
  buildProjectReviewRail,
  projectAnchor,
  projectLabelsFor,
};
