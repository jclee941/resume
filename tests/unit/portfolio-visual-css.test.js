const fs = require('fs');
const path = require('path');

describe('portfolio visual CSS contract', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const stylesDir = path.join(portfolioDir, 'src/styles');

  const readStyle = (fileName) => fs.readFileSync(path.join(stylesDir, fileName), 'utf8');
  const styleFiles = fs.readdirSync(stylesDir).filter((fileName) => fileName.endsWith('.css'));
  const mediaBlock = (css, query) => {
    const start = css.indexOf(`@media ${query}`);
    return start === -1 ? '' : css.slice(start);
  };

  test('S1 desktop hero renders with a layered atmospheric backdrop', () => {
    const variablesCss = readStyle('variables.css');
    const baseCss = readStyle('base.css');
    const heroCss = readStyle('hero.css');

    expect(variablesCss).toContain('--gradient-page-atmosphere');
    // The mid band stays a light tint over --bg-primary so cards keep their tonal step mid-viewport.
    expect(variablesCss).toMatch(
      /linear-gradient\(\s*180deg,\s*transparent 0%,\s*rgb\(var\(--bg-secondary-rgb\) \/ 0\.35\) 44%,\s*transparent 100%\s*\);/
    );
    expect(baseCss).toContain('background: var(--gradient-page-atmosphere);');
    expect(heroCss).toContain('.section-hero::before');
    expect(heroCss).toContain('var(--glass-border)');
    expect(heroCss).toContain('isolation: isolate;');
  });

  test('S2 mobile hero keeps CTAs readable and preserves title scale', () => {
    const heroCss = readStyle('hero.css');
    const heroLayoutCss = readStyle('hero-layout.css');
    const variablesCss = readStyle('variables.css');

    expect(heroCss).toContain('text-wrap: balance;');
    expect(heroCss).toMatch(/\.hero-title\s*{[^}]*font-size: var\(--text-7xl\);/);
    expect(variablesCss).toMatch(/--text-7xl: clamp\(2\.75rem,/);
    const phone = mediaBlock(heroLayoutCss, '(max-width: 640px)');
    expect(phone).toMatch(
      /\.hero-cta\s*{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
    );
    expect(phone).toMatch(/\.hero-cta \.link-subtle--primary\s*{\s*grid-column: 1 \/ -1;/);
  });

  test('S3 contact links remain plain anchors but gain card affordance', () => {
    const surfacesCss = readStyle('surfaces.css');
    const contactCss = readStyle('contact.css');

    expect(surfacesCss).toMatch(
      /\.contact-item\s*\)\s*{[^}]*border: 1px solid var\(--border-subtle\);/
    );
    expect(contactCss).toMatch(
      /\.contact-item:hover::before\s*{\s*transform: translateX\(var\(--space-1\)\);/
    );
  });

  test('project status badges use the locale-aware label face', () => {
    const badgesCss = readStyle('project-badges.css');

    expect(badgesCss).toMatch(/\.project-meta-badge\s*{[^}]*font-family: var\(--font-label\);/);
    expect(badgesCss).toMatch(
      /\.project-meta-badge\s*{[^}]*letter-spacing: var\(--tracking-label\);/
    );
  });

  test('S4 hero proof list stays one readable column at every width', () => {
    const proofCss = readStyle('hero-proof.css');

    expect(proofCss).toMatch(/\.hero-proof-list\s*{[^}]*display: grid;[^}]*max-width: 46rem;/);
    expect(proofCss).not.toMatch(/grid-template-columns: repeat\(2/);
    expect(proofCss).not.toContain('@media');
  });

  test('S5 body keeps an opaque background-color base under the gradient (WCAG contrast)', () => {
    // The atmospheric gradient lives in `background` (an image), which makes
    // getComputedStyle().backgroundColor transparent. Keep an explicit opaque
    // base color so ancestor background-color resolution (and contrast tools)
    // see a solid backdrop behind light hero text.
    const baseCss = readStyle('base.css');
    const bodyRule = baseCss.match(/\bbody\s*{[^}]*}/);
    expect(bodyRule).toBeTruthy();
    expect(bodyRule[0]).toContain('background-color: var(--bg-primary);');
  });

  test('S6 reveal hidden state is gated on reveal-ready (fail-open enhancement)', () => {
    // The hidden state must apply ONLY after ui.js confirms the reveal system
    // initialized (it adds `reveal-ready`). If main.js/ui.js fails, is delayed,
    // or IntersectionObserver is unsupported, the class is never added and all
    // content stays visible. Gating on a synchronous `html.js` flag is NOT
    // enough: JS-enabled-but-app-JS-failed would re-hide content forever.
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toContain('.reveal-ready .reveal {');
    // No hidden rule may be gated on `.js` (the app-JS-failure trap).
    expect(animationsCss).not.toMatch(/\.js\s+\.reveal\s*{[^}]*opacity:\s*0/);
    // No unscoped `.reveal { ... opacity: 0 }` rule may exist either.
    const unscopedReveal = animationsCss.match(/^\.reveal\s*{[^}]*}/m);
    expect(unscopedReveal && /opacity:\s*0/.test(unscopedReveal[0])).toBeFalsy();
  });

  test('S7 reveal-stagger hidden state is gated on reveal-ready', () => {
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toContain('.reveal-ready .reveal-stagger > * {');
    expect(animationsCss).not.toMatch(/\.js\s+\.reveal-stagger\s*>\s*\*\s*{[^}]*opacity:\s*0/);
    const unscopedStagger = animationsCss.match(/^\.reveal-stagger\s*>\s*\*\s*{[^}]*}/m);
    expect(unscopedStagger && /opacity:\s*0/.test(unscopedStagger[0])).toBeFalsy();
  });

  test('S8 revealed state outranks the hidden state regardless of rule order', () => {
    // `.reveal-ready .reveal` and `.reveal-ready .reveal.revealed` differ by one
    // class (0-3-0 vs 0-2-0), so revealed always wins independent of order.
    const animationsCss = readStyle('animations.css');
    expect(animationsCss).toMatch(/\.reveal-ready\s+\.reveal\.revealed\s*{[^}]*opacity:\s*1/);
    expect(animationsCss).toMatch(
      /\.reveal-ready\s+\.reveal-stagger\.revealed\s*>\s*\*\s*{[^}]*opacity:\s*1/
    );
  });

  test('S9 lang-switcher links meet 44px target size and have a focus-visible ring', () => {
    // WCAG 2.5.5 target size + 2.4.7 focus visible for keyboard nav.
    const headerCss = readStyle('site-header.css');
    const langLink = headerCss.match(/\.lang-link\s*{[^}]*}/);
    expect(langLink).toBeTruthy();
    expect(langLink[0]).toMatch(/min-height:\s*44px/);
    expect(headerCss).toMatch(/\.lang-link:focus-visible\s*{[^}]*outline/);
  });

  test('S10 about-content uses a readable line measure (<= 75ch), not an over-wide block', () => {
    // Layout BP (web.dev typography): prose line length 45-75ch is the readable
    // window; 900px lets long Korean lines run far past that, hurting scanability.
    const aboutCss = readStyle('about.css');
    const aboutContent = aboutCss.match(/\.about-content\s*{[^}]*}/);
    expect(aboutContent).toBeTruthy();
    const m = aboutContent[0].match(/max-width:\s*(\d+)ch/);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(75);
    expect(Number(m[1])).toBeGreaterThanOrEqual(45);
  });

  test('S11 about-grid pairs narrative + expertise in 2 columns on desktop, 1 on mobile', () => {
    const aboutCss = readStyle('about.css');
    const aboutGrid = aboutCss.match(/\.about-grid\s*{[^}]*}/);
    expect(aboutGrid).toBeTruthy();
    expect(aboutGrid[0]).toMatch(/display:\s*grid/);
    expect(aboutGrid[0]).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    // Inside its grid column the narrative fills the column instead of keeping
    // the standalone 70ch cap, which would leave an empty gutter.
    const scopedAbout = aboutCss.match(/\.about-grid\s+\.about-content\s*{[^}]*}/);
    expect(scopedAbout).toBeTruthy();
    expect(scopedAbout[0]).toMatch(/max-width:\s*none/);
    expect(mediaBlock(aboutCss, '(max-width: 768px)')).toMatch(
      /\.about-grid\s*{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  test('S12 the page shell stays centered at every width', () => {
    // A mobile `.page-shell { margin: 0 }` override once pinned the column to
    // the left edge with a 24px gap on the right.
    const layoutCss = readStyle('layout.css');
    expect(layoutCss).toMatch(/\.page-shell\s*{[^}]*margin-inline:\s*auto/);
    for (const fileName of styleFiles.filter((name) => name !== 'print.css')) {
      const css = readStyle(fileName);
      expect(css).not.toMatch(/\.page-shell\s*{[^}]*\bmargin(?:-left|-right|-inline)?:\s*0\b/);
    }
  });

  test('S13 case-study cards only start hidden when motion is allowed', () => {
    // Reduced motion removes the entrance animation, so a hidden starting state
    // outside the no-preference query would leave the cards invisible.
    const gridCss = readStyle('project-case-study-grid.css');
    const motionStart = gridCss.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(motionStart).toBeGreaterThan(-1);
    expect(gridCss.slice(0, motionStart)).not.toMatch(/opacity:\s*0\b/);
  });

  test('S14 every referenced custom property is defined', () => {
    // Undefined tokens fail silently: the declaration is dropped and the
    // surface renders without its background or border.
    const runtimeProperties = new Set(['--level-color']);
    const allCss = styleFiles.map(readStyle).join('\n');
    const defined = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    const referenced = new Set(
      [...allCss.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
    );
    const undefinedProperties = [...referenced].filter(
      (name) => !defined.has(name) && !runtimeProperties.has(name)
    );
    expect(undefinedProperties).toEqual([]);
  });

  test('S15 featured project cards stack tech and links under case notes while diagram spans right column on desktop', () => {
    const projectListCss = readStyle('project-list.css');
    const desktop = mediaBlock(projectListCss, '(min-width: 1024px)');

    expect(desktop).toMatch(
      /\.project-card--featured\s*{[^}]*grid-template-rows:\s*auto auto auto auto 1fr;/
    );
    expect(desktop).toMatch(
      /grid-template-areas:\s*'header meta'\s*'notes diagram'\s*'desc diagram'\s*'tech diagram'\s*'links diagram';/
    );
    expect(desktop).toMatch(
      /\.project-card--featured \.project-tech,\s*\.project-card--featured \.project-links\s*{[^}]*align-self:\s*start;[^}]*justify-content:\s*flex-start;/
    );
  });

  test('S16 desktop hero centers .hero-aside vertically against the identity column', () => {
    const heroLayoutCss = readStyle('hero-layout.css');
    const desktop = mediaBlock(heroLayoutCss, '(min-width: 1024px)');

    expect(desktop).toMatch(/\.hero-aside\s*{[^}]*align-self:\s*center;/);
  });

  test('S17 cover-letter decorative quote sits in top padding clearance above the headline text', () => {
    const headlineCss = readStyle('cover-letter-headline.css');
    const responsiveCss = readStyle('cover-letter-responsive.css');
    const mobile = mediaBlock(responsiveCss, '(max-width: 600px)');

    expect(headlineCss).toMatch(
      /\.cover-letter__headline\s*{[^}]*padding:\s*var\(--space-16\)\s+var\(--space-8\)\s+var\(--space-5\);/
    );
    expect(headlineCss).toMatch(
      /\.cover-letter__headline::before\s*{[^}]*top:\s*var\(--space-4\);[^}]*left:\s*var\(--space-8\);[^}]*font-size:\s*var\(--text-4xl\);[^}]*line-height:\s*var\(--leading-none\);/
    );
    expect(mobile).toMatch(
      /\.cover-letter__headline\s*{[^}]*padding:\s*var\(--space-12\)\s+var\(--space-4\)\s+var\(--space-3\);/
    );
    expect(mobile).toMatch(
      /\.cover-letter__headline::before\s*{[^}]*top:\s*var\(--space-3\);[^}]*left:\s*var\(--space-4\);[^}]*font-size:\s*var\(--text-3xl\);/
    );
  });

  test('S18 skills carousel has a focus-visible ring, a two-row mobile grid, and sans font for CJK skill pills', () => {
    const skillRadarCss = readStyle('skill-radar.css');
    const skillCardCss = readStyle('skill-domain-card.css');
    const mobile = mediaBlock(skillRadarCss, 'screen and (max-width: 640px)');

    expect(skillRadarCss).toMatch(
      /\.skill-radar__grid:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-accent\);[^}]*outline-offset:\s*2px;/
    );
    expect(mobile).toMatch(
      /\.skill-radar__grid\s*{[^}]*grid-auto-flow:\s*column dense;[^}]*grid-template-rows:\s*auto auto;/
    );
    expect(mobile).toMatch(/\.skill-domain-card--tall\s*{[^}]*grid-row:\s*span 2;/);
    expect(skillCardCss).toMatch(
      /\.skill-item--cjk\s*{[^}]*font-family:\s*var\(--font-sans\);[^}]*letter-spacing:\s*normal;/
    );
  });

  test('S19 recruiter action bar sizes links to content on one line and skill card headers wrap count below unbroken titles at narrow widths', () => {
    const actionBarCss = readStyle('recruiter-action-bar.css');
    const skillCardCss = readStyle('skill-domain-card.css');
    const skillRadarCss = readStyle('skill-radar.css');
    const mobileBar = mediaBlock(actionBarCss, '(max-width: 768px)');
    const narrowCarousel = mediaBlock(skillRadarCss, 'screen and (max-width: 360px)');

    expect(actionBarCss).toMatch(
      /\.recruiter-action-bar__link\s*{[^}]*flex:\s*1 1 auto;[^}]*white-space:\s*nowrap;/
    );
    expect(actionBarCss).toMatch(/\.recruiter-action-bar__dismiss\s*{[^}]*flex:\s*0 0 44px;/);
    expect(mobileBar).toMatch(/\.recruiter-action-bar\.is-visible\s*{[^}]*display:\s*flex;/);

    expect(skillCardCss).toMatch(/\.skill-domain-card__header\s*{[^}]*flex-wrap:\s*wrap;/);
    expect(skillCardCss).toMatch(
      /\.skill-domain-card__title\s*{[^}]*flex:\s*1 1 auto;[^}]*word-break:\s*keep-all;[^}]*overflow-wrap:\s*normal;/
    );
    expect(narrowCarousel).toMatch(
      /\.skill-radar__grid\s*>\s*\.skill-domain-card\s+\.skill-domain-card__title\s*{[^}]*flex-basis:\s*calc\(100%\s*-\s*36px\s*-\s*var\(--space-3\)\);/
    );
    expect(narrowCarousel).toMatch(
      /\.skill-radar__grid\s*>\s*\.skill-domain-card\s+\.skill-domain-card__count\s*{[^}]*margin-left:\s*calc\(36px\s*\+\s*var\(--space-3\)\);/
    );
  });

  test('S20 role filter marks matches with accent border and desaturates non-matches without lowering opacity', () => {
    const roleFilterCss = readStyle('project-role-filter.css');

    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-match\s*{[^}]*border-color:\s*var\(--color-accent\);/
    );
    expect(roleFilterCss).toMatch(
      /\.project-item\.is-role-dimmed:not\(:hover\):not\(:focus-within\)\s*{[^}]*border-color:\s*var\(--border-primary\);[^}]*filter:\s*saturate\(0\.25\);/
    );
    // Hover and focus restore the untouched base/featured card styles: no restore rule exists.
    expect(roleFilterCss).not.toMatch(/\.is-role-dimmed(?::hover|:focus-within)/);
    expect(roleFilterCss).not.toMatch(/--glass-bg|--border-secondary|--shadow-card(?![\w-])/);
    expect(roleFilterCss).not.toMatch(/opacity/);
  });
});
