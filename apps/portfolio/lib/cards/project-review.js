const { escapeHtml } = require('../template-sanitizer');

const PROJECT_LABELS = {
  ko: {
    problem: '문제',
    role: '한 일',
    proof: '결과',
    caseSummary: '프로젝트 사례 요약',
    diagram: '구성 흐름',
  },
  en: {
    problem: 'Problem',
    role: 'What I did',
    proof: 'Result',
    caseSummary: 'Project case summary',
    diagram: 'Architecture flow',
  },
  ja: {
    problem: '課題',
    role: '担当',
    proof: '結果',
    caseSummary: 'プロジェクト事例の要約',
    diagram: '構成フロー',
  },
};

/**
 * @typedef {{
 *   problem: string;
 *   role: string;
 *   proof: string;
 *   caseSummary: string;
 *   diagram: string;
 * }} ProjectLabels
 */

/**
 * @typedef {Object} ProjectItem
 * @property {string | number} [id]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [tagline]
 * @property {string} [tech]
 */

/**
 * @param {Array<ProjectItem>} projectsData
 * @returns {'ko' | 'en' | 'ja'}
 */
function detectLocale(projectsData) {
  const sample = projectsData.map((project) => project.description || '').join(' ');
  if (/[ぁ-ゟ゠-ヿ一-龯]/.test(sample)) return 'ja';
  if (/[가-힣]/.test(sample)) return 'ko';
  return 'en';
}

/**
 * @param {Array<ProjectItem>} projectsData
 * @returns {ProjectLabels}
 */
function projectLabelsFor(projectsData) {
  return PROJECT_LABELS[detectLocale(projectsData)];
}

/**
 * @param {ProjectItem} project
 * @param {number} index
 * @returns {string}
 */
function projectAnchor(project, index) {
  const id = project.id || project.title || `project-${index + 1}`;
  const slug = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ぁ-ゟ゠-ヿ一-龯]+/g, '-')
    .replace(/^-|-$/g, '');

  return `project-${slug || index + 1}`;
}

/**
 * @param {unknown} description
 * @returns {string[]}
 */
function splitProjectSentences(description) {
  return String(description || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Description sentences that the problem/role/proof case notes do not already show.
 * @param {ProjectItem} project
 * @returns {string}
 */
function projectDescriptionRemainder(project) {
  return splitProjectSentences(project.description).slice(3).join(' ');
}

/**
 * @param {ProjectItem} project
 * @param {ProjectLabels} labels
 * @returns {string}
 */
function buildProjectCaseNotes(project, labels) {
  const sentences = splitProjectSentences(project.description);
  const problem = sentences[0] || project.tagline || project.title;
  const role = sentences[1] || project.tagline || project.tech;
  const proof = sentences[2] || project.tech || project.tagline || project.title;
  const rows = [
    [labels.problem, problem],
    [labels.role, role],
    [labels.proof, proof],
  ]
    .map(
      ([term, detail]) =>
        `<div><dt>${term}</dt><dd>${escapeHtml(/** @type {string} */ (detail))}</dd></div>`
    )
    .join('');
  const summaryLabel = `${escapeHtml(/** @type {string} */ (project.title))} ${labels.caseSummary}`;
  return `<dl class="project-case-notes" aria-label="${summaryLabel}">${rows}</dl>`;
}

module.exports = {
  buildProjectCaseNotes,
  projectAnchor,
  projectDescriptionRemainder,
  projectLabelsFor,
};
