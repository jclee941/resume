/**
 * Enhancement contract tests (고도화)
 *
 * Locks the recruiter-facing enhancement work across five axes:
 *  - Accessibility landmarks (KO/EN source HTML)
 *  - Reduced-motion coverage without glitch chrome
 *  - JA i18n parity (server-side locale data: data_ja.json vs data.json)
 *  - PDF source: LinkedIn contact + accessible accent link colour
 *
 * These are static-source assertions: they read the hand-edited source files
 * (never the generated worker.js) so they stay deterministic and fast.
 */

const fs = require('fs');
const path = require('path');
const { buildJapaneseTemplate } = require('../../../apps/portfolio/lib/html-transformer');
const { escapeRegExp, loadMaster, siteOrigin } = require('../../helpers/owner-data');

const PORTFOLIO = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio');
const DATA = path.join(__dirname, '..', '..', '..', 'packages', 'data', 'resumes', 'master');
const TOOLS = path.join(__dirname, '..', '..', '..', 'tools', 'scripts', 'build');

const read = (p) => fs.readFileSync(p, 'utf-8');

describe('고도화: accessibility landmarks', () => {
  const ko = read(path.join(PORTFOLIO, 'index.html'));
  const en = read(path.join(PORTFOLIO, 'index-en.html'));

  test('KO source removes terminal chrome and keeps semantic landmarks', () => {
    expect(ko).not.toMatch(/class="terminal-window"/);
    expect(ko).toMatch(/<main[^>]*id="main-content"/);
    expect(ko).toMatch(/<nav[^>]*role="navigation"/);
    expect(ko).toMatch(/<footer[^>]*role="contentinfo"/);
    expect(ko).toMatch(
      /class="skip-link"[^>]*href="#main-content"|href="#main-content"[^>]*class="skip-link"/
    );
  });

  test('EN nav declares role="navigation"', () => {
    expect(en).toMatch(/<nav class="minimal-nav"[^>]*role="navigation"/);
  });

  test('EN footer declares role="contentinfo"', () => {
    expect(en).toMatch(/<footer class="site-footer"[^>]*role="contentinfo"/);
  });
});

describe('T3: localized nav toggle copy and deferred metadata', () => {
  const ko = read(path.join(PORTFOLIO, 'index.html'));
  const en = read(path.join(PORTFOLIO, 'index-en.html'));
  const ja = buildJapaneseTemplate(ko);
  const manifest = JSON.parse(read(path.join(PORTFOLIO, 'manifest.json')));
  const manifestEn = JSON.parse(read(path.join(PORTFOLIO, 'manifest_en.json')));
  const names = {
    ko: loadMaster('ko').personal.name,
    en: loadMaster('en').personal.name,
    ja: loadMaster('ja').personal.name,
  };
  // The role is the part of the published manifest title after "<name> - ".
  const targetRole = manifestEn.name.slice(manifestEn.name.indexOf(' - ') + 3);

  test('nav toggle accessible names are localized per locale', () => {
    expect(ko).toContain('aria-label="메뉴 열기"');
    expect(ko).toContain('data-nav-label-close="메뉴 닫기"');
    expect(en).toContain('aria-label="Open navigation"');
    expect(en).toContain('data-nav-label-close="Close navigation"');
    expect(ja).toContain('aria-label="メニューを開く"');
    expect(ja).toContain('data-nav-label-close="メニューを閉じる"');
  });

  test('title/meta/manifest strings use the hiring-decision role convention', () => {
    expect(targetRole.length).toBeGreaterThan(0);
    expect(ko).toContain(`<title>${names.ko} - ${targetRole}</title>`);
    expect(ko).toContain(`<meta property="og:title" content="${names.ko} - ${targetRole}" />`);
    expect(ko).toContain(`<meta name="twitter:title" content="${names.ko} - ${targetRole}" />`);
    expect(en).toContain(`<title>${names.en} - ${targetRole}</title>`);
    expect(en).toMatch(
      new RegExp(
        `<meta\\s+property="og:title"\\s+content="${escapeRegExp(names.en)} - ${escapeRegExp(targetRole)}"`
      )
    );
    expect(en).toMatch(
      new RegExp(
        `<meta\\s+name="twitter:title"\\s+content="${escapeRegExp(names.en)} - ${escapeRegExp(targetRole)}"`
      )
    );
    expect(ja).toContain(`<title>${names.ja} - ${targetRole}</title>`);
    expect(ja).toContain(`<meta property="og:title" content="${names.ja} - ${targetRole}" />`);
    expect(ja).toContain(`"jobTitle": "${targetRole}"`);
    expect(ja).toContain(`"name": "${targetRole} — 面接依頼受付中"`);
    expect(ja).not.toContain('면접 제안 접수 중');
    expect(manifest.name).toBe(`${names.ko} - ${targetRole}`);
    expect(manifest.description).toContain(targetRole);
    expect(manifestEn.name).toBe(`${names.en} - ${targetRole}`);
    expect(manifestEn.description).toContain(targetRole);
  });
});

describe('고도화: SEO hreflang JA', () => {
  test('KO and EN heads both declare a Japanese alternate', () => {
    for (const f of ['index.html', 'index-en.html']) {
      const html = read(path.join(PORTFOLIO, f));
      const jaUrl = escapeRegExp(`${siteOrigin()}/ja/`);
      expect(html).toMatch(new RegExp(`hreflang="ja-JP"[^>]*href="${jaUrl}"|hreflang="ja-JP"`));
      expect(html).toMatch(new RegExp(jaUrl));
    }
  });
});

describe('고도화: reduced-motion without glitch chrome', () => {
  const css = read(path.join(PORTFOLIO, 'src', 'styles', 'animations.css'));
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  test('glitch selectors are removed and reduced motion still neutralizes animation', () => {
    expect(css).not.toMatch(/\.glitch\b/);
    expect(reduced).toMatch(/animation:\s*none|transition:\s*none/);
  });
});

describe('고도화: JA i18n parity', () => {
  test('built ja locale data has top-level key parity with the ko locale', () => {
    // The site serves Japanese via server-side per-locale data (data_ja.json),
    // not a client-side translation dictionary. Assert real parity there.
    const ko = JSON.parse(read(path.join(PORTFOLIO, 'data.json')));
    const ja = JSON.parse(read(path.join(PORTFOLIO, 'data_ja.json')));
    const koKeys = Object.keys(ko).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(jaKeys.length).toBeGreaterThan(0);
    expect(jaKeys).toEqual(koKeys);
  });
});

describe('고도화: PDF source polish', () => {
  test('resume_master.md contact block includes LinkedIn', () => {
    const md = read(path.join(DATA, 'resume_master.md'));
    expect(md).toMatch(/linkedin\.com\/in\//i);
  });

  test('PDF generator uses a non-default accessible accent link colour, not literal blue', () => {
    const gen = read(path.join(TOOLS, 'pdf-generator', 'renderer.go'));
    expect(gen).not.toMatch(/linkcolor:blue/);
    expect(gen).toMatch(
      /linkcolor:(?!(?:blue|black|gray|grey|white)\b)(?:[a-z]+|\[HTML\]\{[0-9A-Fa-f]{6}\}|[0-9A-Fa-f]{6})/
    );
  });
});

describe('FAANG framing: case-study senior narrative', () => {
  const src = read(path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'project-cards-data.js'));

  test('case studies frame a design decision / trade-off', () => {
    // The case-study cards should read like senior engineering: an explicit
    // constraint or trade-off, not just a task list.
    expect(src).toMatch(/제약|트레이드오프|설계 결정|trade-off|constraint/);
  });

  test('does not introduce fabricated percentage/ratio metrics', () => {
    // Guard the no-metrics rule on the case-study source.
    expect(src).not.toMatch(/\b\d{1,3}\s?%/);
  });

  test('architecture diagrams stay compact enough for mobile deep-dive panels', () => {
    const matches = [...src.matchAll(/architecture:\s*`([\s\S]*?)`/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [, diagram] of matches) {
      const lineLengths = diagram.split('\n').map((line) => [...line].length);
      expect(Math.max(...lineLengths)).toBeLessThanOrEqual(32);
    }
  });
});

describe('Project deep-dive architecture diagram accessibility', () => {
  const overlay = read(
    path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'project-deep-dive-overlay.js')
  );
  const renderer = read(
    path.join(PORTFOLIO, 'src', 'scripts', 'modules', 'project-architecture-renderer.js')
  );

  test('architecture diagram fallback is keyboard focusable and exposed as an image-like flow', () => {
    expect(renderer).toMatch(/createElement\('div', 'architecture-diagram'\)/);
    expect(renderer).toMatch(/diagram\.tabIndex = 0/);
    expect(renderer).toMatch(/diagram\.setAttribute\('role', 'img'\)/);
    expect(renderer).toMatch(
      /diagram\.setAttribute\('aria-label', `\$\{project\.title\} architecture flow`\)/
    );
    expect(overlay).toMatch(/createArchitectureElement\(project\)/);
  });

  test('architecture flow renders step nodes and falls back to pre only when fewer than 2 steps', () => {
    expect(renderer).toMatch(/function createArchitectureSteps/);
    expect(renderer).toMatch(/function architectureSteps/);
    expect(renderer).toMatch(/if \(steps\.length < 2\) return null/);
    expect(renderer).toMatch(/createElement\('ol', 'architecture-steps'\)/);
    expect(renderer).toMatch(/createElement\('span', 'architecture-step__index'/);
    expect(renderer).toMatch(/createElement\('span', 'architecture-step__label'/);
    expect(renderer).toMatch(/createElement\('span', 'architecture-step__caption'/);
  });

  test('stylesheet shows step nodes at all widths with down-arrow connector and caption styles', () => {
    const css = read(path.join(PORTFOLIO, 'src', 'styles', 'project-architecture-flow.css'));
    const stepsRule = css.slice(
      css.indexOf('.architecture-steps {'),
      css.indexOf('.architecture-step {')
    );
    expect(stepsRule).not.toMatch(/display:\s*none/);
    expect(css).toMatch(/\.architecture-step \+ \.architecture-step::before[\s\S]*?content:\s*'↓'/);
    expect(css).toContain('.architecture-step__caption');
    const mobileBlock = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobileBlock).toContain('.architecture-steps');
    expect(mobileBlock).not.toContain('max-block-size');
  });

  test('parses real ASCII samples from project-cards-data.js and project-cards-automation-data.js into at least 2 step nodes', async () => {
    const modulesDir = path.join(PORTFOLIO, 'src', 'scripts', 'modules');
    const { PROJECTS } = await import(path.join(modulesDir, 'project-cards-data.js'));
    const { AUTOMATION_PROJECTS } = await import(
      path.join(modulesDir, 'project-cards-automation-data.js')
    );
    const { architectureSteps, createArchitectureElement } = await import(
      path.join(modulesDir, 'project-architecture-renderer.js')
    );

    const makeEl = (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      textContent: '',
      tabIndex: -1,
      attributes: {},
      children: [],
      classList: {
        classes: new Set(),
        add(cls) {
          this.classes.add(cls);
        },
        contains(cls) {
          return this.classes.has(cls);
        },
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      appendChild(node) {
        this.children.push(node);
        return node;
      },
    });
    const prevDocument = global.document;
    global.document = { createElement: makeEl };

    try {
      const allSamples = [...PROJECTS, ...AUTOMATION_PROJECTS];
      expect(PROJECTS.length).toBeGreaterThan(0);
      expect(AUTOMATION_PROJECTS.length).toBeGreaterThan(0);

      for (const project of allSamples) {
        const steps = architectureSteps(project.architecture);
        expect(steps.length).toBeGreaterThanOrEqual(2);
        for (const step of steps) {
          expect(step.label.length).toBeGreaterThan(0);
          expect(step.label).not.toMatch(/[┌┐└┘│─]/);
        }

        const flow = createArchitectureElement(project);
        expect(flow.children).toHaveLength(1);
        const list = flow.children[0];
        expect(list.tagName).toBe('OL');
        expect(list.className).toBe('architecture-steps');
        expect(list.children.length).toBe(steps.length);
        expect(list.children.length).toBeGreaterThanOrEqual(2);
      }

      const captionedSample = [
        '┌────────────┐',
        '│ Edge Entry │',
        '│ Worker     │',
        '└─────┬──────┘',
        '      │ HTTPS webhook',
        '      ▼',
        '┌────────────┐',
        '│ Queue      │',
        '│ Consumer   │',
        '└────────────┘',
      ].join('\n');
      const captionedSteps = architectureSteps(captionedSample);
      expect(captionedSteps).toEqual([
        { label: 'Edge Entry Worker' },
        { label: 'Queue Consumer', caption: 'HTTPS webhook' },
      ]);
      const captionedFlow = createArchitectureElement({
        title: 'Captioned',
        architecture: captionedSample,
      });
      const secondItem = captionedFlow.children[0].children[1];
      expect(secondItem.classList.contains('architecture-step--captioned')).toBe(true);
      expect(secondItem.children[0].className).toBe('architecture-step__caption');
      expect(secondItem.children[0].textContent).toBe('HTTPS webhook');

      const singleBoxFlow = createArchitectureElement({
        title: 'Fallback',
        architecture: '┌───────┐\n│ Alone │\n└───────┘',
      });
      expect(singleBoxFlow.children).toHaveLength(1);
      expect(singleBoxFlow.children[0].className).toBe('architecture-diagram');
      expect(singleBoxFlow.children[0].children[0].tagName).toBe('PRE');
    } finally {
      global.document = prevDocument;
    }
  });

  test('deep-dive overlay uses localized 핵심 구성 / Key components / 主な構成要素 heading instead of 운영 지표', async () => {
    expect(overlay).not.toContain('운영 지표');
    expect(overlay).toContain('핵심 구성');
    expect(overlay).toContain('Key components');
    expect(overlay).toContain('主な構成要素');

    const modulesDir = path.join(PORTFOLIO, 'src', 'scripts', 'modules');
    const { PROJECTS } = await import(path.join(modulesDir, 'project-cards-data.js'));
    const { createDeepDiveOverlay } = await import(
      path.join(modulesDir, 'project-deep-dive-overlay.js')
    );

    const makeEl = (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        className: '',
        id: '',
        type: '',
        textContent: '',
        dataset: {},
        style: {},
        attributes: {},
        children: [],
        classList: {
          add() {},
          remove() {},
        },
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        append(...nodes) {
          this.children.push(...nodes);
        },
        appendChild(node) {
          this.children.push(node);
          return node;
        },
        replaceChildren(...nodes) {
          this.children = nodes;
        },
        addEventListener() {},
        focus() {},
        querySelector(selector) {
          const visit = (node) => {
            if (selector === '#deep-dive-content' && node.id === 'deep-dive-content') return node;
            if (selector === '.deep-dive-close' && node.className === 'deep-dive-close') {
              return node;
            }
            for (const child of node.children || []) {
              const found = visit(child);
              if (found) return found;
            }
            return null;
          };
          return visit(this);
        },
        querySelectorAll() {
          return [];
        },
      };
      return el;
    };

    const collectH3 = (node, acc = []) => {
      if (node && node.tagName === 'H3') acc.push(node.textContent);
      for (const child of (node && node.children) || []) collectH3(child, acc);
      return acc;
    };

    const prevDocument = global.document;
    const prevWindow = global.window;
    const body = makeEl('body');
    global.window = { setTimeout: () => 0 };
    global.document = {
      documentElement: { lang: 'ko' },
      body,
      activeElement: null,
      createElement: makeEl,
      createElementNS: (_ns, tag) => makeEl(tag),
      createTextNode: (text) => ({ textContent: text }),
      addEventListener() {},
    };

    try {
      const instance = createDeepDiveOverlay();
      for (const [lang, expectedHeading] of [
        ['ko', '핵심 구성'],
        ['en', 'Key components'],
        ['ja', '主な構成要素'],
      ]) {
        global.document.documentElement.lang = lang;
        instance.open(PROJECTS[0]);
        const headings = collectH3(body);
        expect(headings).toContain(expectedHeading);
        expect(headings).not.toContain('운영 지표');
      }
    } finally {
      global.document = prevDocument;
      global.window = prevWindow;
    }
  });
});

describe('B: engineering principles + current focus surfaced from SSoT (single source)', () => {
  const ko = read(path.join(PORTFOLIO, 'index.html'));
  const en = read(path.join(PORTFOLIO, 'index-en.html'));
  const workerSrc = read(path.join(PORTFOLIO, 'worker.js'));
  const koLocale = (workerSrc.match(/const INDEX_HTML = `([\s\S]*?)`;/) || ['', ''])[1];
  const enLocale = (workerSrc.match(/const INDEX_EN_HTML = `([\s\S]*?)`;/) || ['', ''])[1];

  test('the duplicate hardcoded about-principles block is removed from source', () => {
    // Principles/focus are surfaced once via the data-driven about-content
    // placeholder; the previously-hardcoded duplicate block must be gone.
    expect(ko).not.toMatch(/id="about-principles"|class="about-principles"/);
    expect(en).not.toMatch(/id="about-principles"|class="about-principles"/);
  });

  test('built KO locale surfaces career_highlights as the single About narrative', () => {
    // About was simplified: career_highlights is the one narrative block; the
    // overlapping tech_philosophy / current_focus blocks were removed to cut
    // clutter (the career story is also covered by achievements + the timeline).
    expect(koLocale).toContain('about-label">경력 하이라이트<');
    expect(koLocale).not.toMatch(/about-principles/);
    expect(koLocale).not.toMatch(/&gt; tech_philosophy/);
    expect(koLocale).not.toMatch(/&gt; current_focus/);
  });

  test('built EN locale surfaces career_highlights as the single About narrative', () => {
    expect(enLocale).toContain('about-label">Career highlights<');
    expect(enLocale).not.toMatch(/about-principles/);
    expect(enLocale).not.toMatch(/&gt; tech_philosophy/);
    expect(enLocale).not.toMatch(/&gt; current_focus/);
  });

  test('does not add resume-inflation sections (careerGap/awards/military)', () => {
    const block = ko.slice(ko.indexOf('about-principles'), ko.indexOf('about-principles') + 2000);
    expect(block).not.toMatch(/careerGap|공백기|수상|병역/);
  });
});

describe('C: print stylesheet exists without CLI chrome', () => {
  const printCss = (() => {
    const p = path.join(PORTFOLIO, 'src', 'styles', 'print.css');
    return require('fs').existsSync(p) ? read(p) : '';
  })();
  const mainCss = read(path.join(PORTFOLIO, 'src', 'styles', 'main.css'));

  test('print.css exists and is imported by main.css', () => {
    expect(printCss.length).toBeGreaterThan(0);
    expect(mainCss).toContain("@import './print.css'");
  });

  test('print stylesheet wraps rules in @media print without CLI references and keeps links printable', () => {
    expect(printCss).toContain('@media print');
    expect(printCss).not.toMatch(/\.cli-container|#cli-container/);
    expect(printCss).toMatch(/a\[href/);
  });
});
