const fs = require('fs');
const path = require('path');

const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');
const { generateProjectCards } = require('../../../../apps/portfolio/lib/cards');
const {
  assertFeaturedProjectContract,
  buildProjectEvidence,
  projectLabelsFor,
} = require('../../../../apps/portfolio/lib/cards/project-review');

const ROOT = path.resolve(__dirname, '../../../..');
const FEATURED_IDS = [
  'safetywallet-cf-workers-pwa',
  'resume-portfolio',
  'ip-blacklist-platform',
];
const LOCALES = ['ko', 'en', 'ja'];
const DATA_FILES = {
  ko: 'data.json',
  en: 'data_en.json',
  ja: 'data_ja.json',
};
const EXPECTED_LABELS = {
  ko: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
  en: [
    'Product UI',
    'Backend & API',
    'Data & Workflows',
    'Delivery & Operations',
    'Security & Reliability',
  ],
  ja: [
    'プロダクトUI',
    'バックエンド・API',
    'データ・ワークフロー',
    'デリバリー・運用',
    'セキュリティ・信頼性',
  ],
};

function projectsFor(locale) {
  const file = path.join(ROOT, 'apps', 'portfolio', DATA_FILES[locale]);
  return JSON.parse(fs.readFileSync(file, 'utf8')).projects;
}

function ordered(projects) {
  return [...projects].sort((a, b) => a.displayOrder - b.displayOrder);
}

beforeEach(() => {
  TEMPLATE_CACHE.dataHash = null;
  TEMPLATE_CACHE.projectCardsHtml = null;
});

describe('structured full-stack project rendering', () => {
  test.each(LOCALES)('%s renders the exact featured order and stable rail/card anchors', (locale) => {
    const projects = projectsFor(locale);
    const html = generateProjectCards(projects, `structured-projects:${locale}`);
    const sorted = ordered(projects);

    expect(sorted.slice(0, 3).map(({ id }) => id)).toEqual(FEATURED_IDS);
    expect(
      [...html.matchAll(/class="project-review-rail__link" href="#([^"]+)"/g)].map(
        (match) => match[1]
      )
    ).toEqual(FEATURED_IDS.map((id) => `project-${id}`));
    expect(
      [...html.matchAll(/<li id="(project-[^"]+)" class="project-item/g)]
        .slice(0, 3)
        .map((match) => match[1])
    ).toEqual(FEATURED_IDS.map((id) => `project-${id}`));
  });

  test.each(LOCALES)('%s uses exact localized labels and semantic architecture lists', (locale) => {
    const projects = projectsFor(locale);
    const html = generateProjectCards(projects, `structured-evidence:${locale}`);
    const labels = projectLabelsFor(projects);

    expect([
      labels.productUi,
      labels.backendApi,
      labels.dataWorkflows,
      labels.deliveryOperations,
      labels.securityReliability,
    ]).toEqual(EXPECTED_LABELS[locale]);
    expect(html).toContain('<ol class="project-architecture-steps"');
    expect(html).toContain(`aria-label="${labels.architecture}"`);
    expect(html).not.toContain('architecture-diagram__text');
    expect(html).not.toContain('ACTIVE');
  });

  test('renders only populated evidence layers in deterministic capability order', () => {
    const projects = projectsFor('en');
    const labels = projectLabelsFor(projects);
    const blacklist = ordered(projects)[2];
    const html = buildProjectEvidence(blacklist, labels);

    expect([...html.matchAll(/<dt>([^<]+)<\/dt>/g)].map((match) => match[1])).toEqual([
      'Backend &amp; API',
      'Data &amp; Workflows',
      'Security &amp; Reliability',
    ]);
    expect(html).not.toContain('Product UI');
    expect(html).not.toContain('Delivery & Operations');
  });

  test.each([
    [
      'missing featured id',
      (projects) => projects.filter(({ id }) => id !== FEATURED_IDS[0]),
      /missing featured project/i,
    ],
    [
      'duplicate display order',
      (projects) => projects.map((project, index) => ({ ...project, displayOrder: index < 2 ? 1 : project.displayOrder })),
      /duplicate displayOrder/i,
    ],
    [
      'unknown evidence key',
      (projects) => projects.map((project) =>
        project.id === FEATURED_IDS[0]
          ? { ...project, fullStackEvidence: { ...project.fullStackEvidence, madeUp: 'no' } }
          : project
      ),
      /unsupported evidence key/i,
    ],
    [
      'unsupported layer value',
      (projects) => projects.map((project) =>
        project.id === FEATURED_IDS[0]
          ? { ...project, fullStackEvidence: { ...project.fullStackEvidence, userSurface: [] } }
          : project
      ),
      /non-empty string/i,
    ],
  ])('rejects %s', (_name, mutate, message) => {
    expect(() => assertFeaturedProjectContract(mutate(projectsFor('en')))).toThrow(message);
  });
});
