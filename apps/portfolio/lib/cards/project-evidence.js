const { escapeHtml } = require('../template-sanitizer');

const FEATURED_PROJECT_IDS = [
  'safetywallet-cf-workers-pwa',
  'resume-portfolio',
  'ip-blacklist-platform',
];

const EVIDENCE_FIELDS = [
  ['userSurface', 'productUi'],
  ['backendApi', 'backendApi'],
  ['dataAsync', 'dataWorkflows'],
  ['deliveryOperations', 'deliveryOperations'],
  ['securityReliability', 'securityReliability'],
];

const SUPPORTED_KEYS = new Set([
  ...EVIDENCE_FIELDS.map(([key]) => key),
  'architectureSteps',
]);

function buildProjectEvidence(project, labels) {
  const evidence = project.fullStackEvidence;
  if (!evidence) return '';

  const rows = EVIDENCE_FIELDS.flatMap(([key, labelKey]) => {
    const value = evidence[key];
    if (!value) return [];
    return [
      `<div><dt>${escapeHtml(labels[labelKey])}</dt><dd>${escapeHtml(value)}</dd></div>`,
    ];
  });
  const evidenceList = rows.length
    ? `<dl class="project-evidence" aria-label="${escapeHtml(labels.evidence)}">${rows.join('')}</dl>`
    : '';
  const architecture = buildArchitectureSteps(evidence.architectureSteps, labels.architecture);
  return `${evidenceList}${architecture}`;
}

function buildArchitectureSteps(steps, label) {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  const items = steps
    .map(
      (step, index) =>
        `<li><span class="project-architecture-step__index">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(step)}</span></li>`
    )
    .join('');
  return `<ol class="project-architecture-steps" aria-label="${escapeHtml(label)}">${items}</ol>`;
}

function assertFeaturedProjectContract(projects) {
  if (!Array.isArray(projects)) throw new TypeError('Projects must be an array');
  assertUniqueOrders(projects);

  const projectById = new Map(projects.map((project) => [project.id, project]));
  for (const id of FEATURED_PROJECT_IDS) {
    if (!projectById.has(id)) throw new Error(`Missing featured project: ${id}`);
  }

  const orderedIds = [...projects]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, FEATURED_PROJECT_IDS.length)
    .map(({ id }) => id);
  if (orderedIds.some((id, index) => id !== FEATURED_PROJECT_IDS[index])) {
    throw new Error(`Featured project order mismatch: ${orderedIds.join(', ')}`);
  }

  for (const project of projects) validateEvidence(project);
}

function assertUniqueOrders(projects) {
  const seen = new Set();
  for (const { displayOrder } of projects) {
    if (seen.has(displayOrder)) throw new Error(`Duplicate displayOrder: ${displayOrder}`);
    seen.add(displayOrder);
  }
}

function validateEvidence(project) {
  const evidence = project.fullStackEvidence;
  if (!evidence) return;
  for (const [key, value] of Object.entries(evidence)) {
    if (!SUPPORTED_KEYS.has(key)) throw new Error(`Unsupported evidence key: ${key}`);
    if (key === 'architectureSteps') {
      if (
        !Array.isArray(value) ||
        value.length < 2 ||
        value.length > 6 ||
        value.some((step) => typeof step !== 'string' || step.trim() === '')
      ) {
        throw new Error('architectureSteps must contain 2-6 non-empty strings');
      }
    } else if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${key} must be a non-empty string`);
    }
  }
}

module.exports = {
  FEATURED_PROJECT_IDS,
  assertFeaturedProjectContract,
  buildProjectEvidence,
};
