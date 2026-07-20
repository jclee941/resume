/**
 * Static CSS contract for the visual revamp (answers the "그대로" / unchanged
 * complaint). All assertions read source CSS — they pin that the revamp rules
 * express a clean dark-neutral professional layout; no terminal/cyberpunk
 * chrome or neon palette. CSS is hard to unit-test behaviorally, so these are
 * structural/source assertions (deterministic, fast).
 */

const fs = require('fs');
const path = require('path');

const STYLES = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio', 'src', 'styles');
const read = (f) => fs.readFileSync(path.join(STYLES, f), 'utf-8');
const ROOT = path.resolve(__dirname, '../../..');
const readRoot = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const APPROVED_IDENTITY = 'evidence-backed full-stack systems studio';
const OLD_IDENTITY = 'quiet security command center';
const SECTION_SEQUENCE = [
  '#hero', '#projects', '#skills', '#resume', '#operated', '#about', '#cover-letter', '#certifications', '#contact',
];
const visibleText = (markdown) => markdown
  .replace(/&#160;/g, ' ')
  .replace(/&#(?:8203|8288);/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function identityContractProblems(markdown) {
  const firstIdentity = markdown.match(/## 1\. Atmosphere & Identity\s+([^\n]+)/)?.[1] ?? '';
  const problems = [];
  if (!firstIdentity.includes(APPROVED_IDENTITY)) problems.push('approved identity is not first');
  if (firstIdentity.toLowerCase().includes(OLD_IDENTITY)) problems.push('old identity remains normative');
  return problems;
}

describe('visual revamp: hero atmospheric depth', () => {
  const layout = read('layout.css');
  test('hero section does not use glow/radial-gradient atmospheric pseudo-layer', () => {
    expect(layout).not.toMatch(/\.section-hero::before[\s\S]{0,200}radial-gradient/);
  });
});

describe('visual revamp: clean accent and section heading system', () => {
  const layout = read('layout.css');
  const theme = read('variables.css');
  const css = `${theme}\n${layout}`;

  test('neon palette tokens are removed and clean accent token exists', () => {
    expect(css).not.toMatch(/--cyber-magenta|--cyber-green|--glow-/);
    expect(css).toMatch(/--color-accent/);
  });

  test('section headings do not use neon gradient underline', () => {
    expect(layout).not.toMatch(/\.section-title::after[\s\S]{0,200}--cyber-/);
  });
});

describe('visual revamp: subtle neutral section dividers', () => {
  const layout = read('layout.css');
  test('section divider uses a solid neutral border, not a gradient border image', () => {
    expect(layout).toMatch(/1px solid var\(--border/);
    expect(layout).not.toMatch(/border-image[\s\S]{0,200}gradient/);
  });
});

describe('visual revamp: restrained hero typography', () => {
  const hero = read('hero.css');
  test('hero title has no glow or text-shadow', () => {
    const start = hero.indexOf('.hero-title');
    const heroCss = start === -1 ? '' : hero.slice(start, start + 500);
    expect(heroCss).not.toMatch(/text-shadow|--glow-/);
  });
});

describe('visual revamp: non-interactive cards stay still', () => {
  const cards = read('cards.css');
  test('generic cards do not imply an interaction on hover', () => {
    expect(cards).not.toMatch(/\.card:hover/);
  });
});

describe('visual revamp guards: print + reduced-motion', () => {
  const print = read('print.css');
  const anim = read('animations.css');
  test('print stylesheet still exists', () => {
    expect(print).toMatch(/@media print/);
  });
  test('reduced-motion block still present (covers any new motion)', () => {
    expect(anim).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('portfolio documentation: approved full-stack systems-studio contract', () => {
  const design = readRoot('apps/portfolio/DESIGN.md');
  const masterplan = readRoot('docs/architecture/portfolio-visual-masterplan.md');
  const requirements = readRoot('docs/portfolio-requirements.md');
  const agents = readRoot('apps/portfolio/AGENTS.md');

  test('makes the approved identity normative and rejects the old identity fixture', () => {
    expect(identityContractProblems(design)).toEqual([]);
    const oldFixture = design.replace(APPROVED_IDENTITY, 'quiet security command center');
    expect(identityContractProblems(oldFixture)).toEqual(
      expect.arrayContaining(['approved identity is not first', 'old identity remains normative'])
    );
  });

  test('pins preserved qualities, removed chrome, viewports, CJK, and code-native visuals', () => {
    for (const phrase of [
      'dark graphite surfaces',
      'cyan focus and accent',
      'strong contrast',
      'restrained motion',
      'existing keyboard behavior',
      'CJK-safe typography',
      'terminal windows',
      'command prompts',
      'incident-timeline labels',
      'packet/status chrome',
      'forced activity glow',
      '`375px`',
      '`768px`',
      '`1280px`',
      '`word-break: keep-all`',
      '`line-break: strict`',
      '`overflow-wrap: anywhere`',
      'code-native architecture visuals',
    ]) {
      expect(design).toContain(phrase);
    }
    expect(design).toMatch(/hover[\s\S]*active[\s\S]*focus-visible/);
    expect(design).toContain('prefers-reduced-motion');
  });

  test('pins the exact information architecture, navigation, and locale copy matrix', () => {
    expect([...masterplan.matchAll(/^\d+\. `([^`]+)`$/gm)].map((match) => match[1])).toEqual(
      SECTION_SEQUENCE
    );
    expect(masterplan).toContain('projects → `#projects`');
    expect(masterplan).toContain('stack → `#skills`');
    expect(masterplan).toContain('experience → `#resume`');
    expect(masterplan).toContain('contact → `#contact`');

    for (const phrase of [
      '풀스택 엔지니어',
      'Full-Stack Engineer',
      'フルスタックエンジニア',
      '보안 자동화 · 엣지 인프라',
      'Security Automation & Edge Infrastructure',
      'セキュリティ自動化・エッジインフラ',
      '제품 UI / 백엔드·API / 데이터·워크플로 / 배포·운영 / 보안·신뢰성',
      'Product UI / Backend & API / Data & Workflows / Delivery & Operations / Security & Reliability',
      'プロダクトUI / バックエンド・API / データ・ワークフロー / デリバリー・運用 / セキュリティ・信頼性',
    ]) {
      expect(visibleText(masterplan)).toContain(phrase);
    }
  });

  test('keeps normative Markdown mobile-safe in generic renderers', () => {
    for (const markdown of [design, masterplan, requirements, agents]) {
      expect(markdown).not.toMatch(/^\|/m);
      expect(markdown).not.toContain('```');
    }
    expect(masterplan).toContain('installed `pandoc` executable');
    expect(masterplan).toContain('[`package.json`](../../package.json)');
  });

  test('visibly supersedes the cyberpunk requirements and points to current contracts', () => {
    expect(requirements.slice(0, 700)).toMatch(/superseded/i);
    expect(requirements.slice(0, 700)).toContain('[Portfolio Design System](../apps/portfolio/DESIGN.md)');
    expect(requirements.slice(0, 700)).toContain(
      '[Portfolio Visual Masterplan](./architecture/portfolio-visual-masterplan.md)'
    );
  });

  test('documents canonical and generated source ownership without generated-file edits', () => {
    for (const phrase of [
      '`packages/data/resumes/master/resume_data.json`',
      '`resume_data_en.json`',
      '`resume_data_ja.json`',
      '`npm run sync:data`',
      '`apps/portfolio/data*.json`',
      '`packages/data/resumes/master/resume_master.md`',
      '`packages/data/resumes/master/resume_summary.md`',
      '`npm run sync:pdf`',
      '`apps/portfolio/generate-og-image.js`',
    ]) {
      expect(agents).toContain(phrase);
    }
    expect(agents).toMatch(/Never (?:hand-)?edit[^\n]*generated/i);
  });
});
