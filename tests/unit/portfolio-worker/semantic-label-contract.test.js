const fs = require('fs');
const path = require('path');

const { generateProjectCards } = require('../../../apps/portfolio/lib/cards');

const ROOT = path.resolve(__dirname, '../../..');
const TIMELINE_RENDERING_PATH = path.join(
  ROOT,
  'apps/portfolio/src/scripts/modules/timeline-rendering.js'
);
const SKILL_RADAR_PATH = path.join(ROOT, 'apps/portfolio/src/scripts/modules/skill-radar.js');

const career = {
  company: 'Example Corp',
  companyUrl: null,
  period: '2024.01 ~ 현재',
  phase: '운영',
  status: 'active',
  role: 'Full-stack Engineer',
  myRole: '서비스 운영',
  description: '서비스를 운영했습니다.',
  achievements: ['사용자 흐름과 API를 함께 개선했습니다.'],
};

describe('renderer semantic-label contract', () => {
  let createTimelineNode;

  beforeAll(async () => {
    global.document = { documentElement: { lang: 'ko' } };
    ({ createTimelineNode } = await import(TIMELINE_RENDERING_PATH));
  });

  afterAll(() => {
    delete global.document;
  });

  test('baseline: timeline keeps visible period and impact labels', () => {
    const html = createTimelineNode(career, 0);

    expect(html).toContain('<time>2024.01 ~ 현재</time>');
    expect(html).toContain('<span class="impact-label">성과:</span>');
  });

  test('timeline does not put accessible names on generic divs', () => {
    const html = createTimelineNode(career, 0);

    expect(html).not.toMatch(/<div[^>]+aria-label=/);
  });

  test('baseline: project metadata remains visible', () => {
    const html = generateProjectCards(
      [
        {
          title: 'Semantic Project',
          tech: 'Node.js',
          description: 'Project description',
          language: 'JavaScript',
          status: 'active',
        },
      ],
      'semantic-label-baseline'
    );

    expect(html).toContain('project-meta-badge--language">JavaScript</span>');
    expect(html).toContain('project-meta-badge--status">active</span>');
  });

  test('project metadata does not put an accessible name on a generic div', () => {
    const html = generateProjectCards(
      [
        {
          title: 'Semantic Project',
          tech: 'Node.js',
          description: 'Project description',
          language: 'JavaScript',
          status: 'active',
        },
      ],
      'semantic-label-new-contract'
    );

    expect(html).not.toMatch(/<div class="project-meta"[^>]+aria-label=/);
  });

  test('skill tier uses its visible label instead of naming a generic div', () => {
    const source = fs.readFileSync(SKILL_RADAR_PATH, 'utf8');

    expect(source).toContain("createElement('span', 'skill-domain-card__level-label', tierLabel)");
    expect(source).not.toContain("indicator.setAttribute('aria-label', tierLabel)");
  });
});
