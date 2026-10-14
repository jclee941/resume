const { escapeHtml } = require('../template-sanitizer');

const PROJECT_LABELS = {
  ko: {
    problem: '문제',
    role: '한 일',
    proof: '결과',
    diagram: '구성 흐름',
    live: '공개 중',
    active: '운영 중',
    completed: '완료',
  },
  en: {
    problem: 'Problem',
    role: 'What I did',
    proof: 'Result',
    diagram: 'Architecture flow',
    live: 'LIVE',
    active: 'ACTIVE',
    completed: 'COMPLETED',
  },
  ja: {
    problem: '課題',
    role: '担当',
    proof: '結果',
    diagram: '構成フロー',
    live: '公開中',
    active: '運用中',
    completed: '完了',
  },
};

/**
 * @typedef {{
 *   problem: string;
 *   role: string;
 *   proof: string;
 *   diagram: string;
 *   live: string;
 *   active: string;
 *   completed: string;
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
    .split(/(?<=[.!?])\s+|(?<=[。！？])\s*/)
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
 * Renders one row per description sentence (problem, what I did, result). An empty description
 * falls back to the tagline, then the title, so the problem row always exists.
 * @param {ProjectItem} project
 * @param {ProjectLabels} labels
 * @returns {string}
 */
function buildProjectCaseNotes(project, labels) {
  const sentences = splitProjectSentences(project.description);
  const rows = [
    [labels.problem, sentences[0] || project.tagline || project.title],
    [labels.role, sentences[1]],
    [labels.proof, sentences[2]],
  ]
    .filter(([, detail]) => detail)
    .map(
      ([term, detail]) =>
        `<div><dt>${term}</dt><dd>${escapeHtml(/** @type {string} */ (detail))}</dd></div>`
    )
    .join('');
  return `<dl class="project-case-notes">${rows}</dl>`;
}

module.exports = {
  buildProjectCaseNotes,
  detectLocale,
  projectAnchor,
  projectDescriptionRemainder,
  projectLabelsFor,
};
