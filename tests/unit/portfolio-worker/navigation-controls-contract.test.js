const fs = require('fs');
const path = require('path');
const { buildJapaneseTemplate } = require('../../../apps/portfolio/lib/japanese-template');

const PORTFOLIO = path.resolve(__dirname, '../../../apps/portfolio');
const read = (...parts) => fs.readFileSync(path.join(PORTFOLIO, ...parts), 'utf8');
const style = (name) => read('src', 'styles', name);

function stripBlocks(css, header) {
  let out = css;
  for (let start = out.indexOf(header); start !== -1; start = out.indexOf(header)) {
    let depth = 0;
    let end = start;
    for (let i = out.indexOf('{', start); i < out.length; i += 1) {
      if (out[i] === '{') depth += 1;
      if (out[i] === '}') depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
}

function mediaBlock(css, header) {
  const start = css.indexOf(header);
  if (start === -1) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    if (depth === 0) return css.slice(start, i + 1);
  }
  return '';
}

describe.each(['index.html', 'index-en.html'])('header markup in %s', (file) => {
  const html = read(file);
  const header = html.slice(
    html.indexOf('<header class="site-header">'),
    html.indexOf('</header>')
  );

  test('renders the language switcher where phones and desktop show it, in focus order', () => {
    const phone = header.indexOf('lang-switcher lang-switcher--phone');
    const toggle = header.indexOf('class="nav-toggle"');
    const links = header.indexOf('id="nav-links"');
    const desktop = header.indexOf('lang-switcher lang-switcher--desktop');
    expect([phone, toggle, links, desktop].every((index) => index > 0)).toBe(true);
    expect(phone).toBeLessThan(toggle);
    expect(toggle).toBeLessThan(links);
    expect(links).toBeLessThan(desktop);
    expect(header.match(/class="lang-switcher\b/g)).toHaveLength(2);
  });

  test('never reorders focus with a positive tabindex and opts the toggle into tooltips', () => {
    expect(header).not.toMatch(/tabindex="[1-9]/);
    expect(header).toMatch(/<button\s+class="nav-toggle"\s+data-tooltip\b/);
  });

  test('the Japanese build marks JA current in both switchers', () => {
    const built = buildJapaneseTemplate(html);
    const switchers = built.slice(
      built.indexOf('<header class="site-header">'),
      built.indexOf('</header>')
    );
    const current = [
      ...switchers.matchAll(/<a\b[^>]*aria-current="true"[^>]*>\s*(KO|EN|JA)\s*<\/a\s*>/g),
    ].map((match) => match[1]);
    expect(current).toEqual(['JA', 'JA']);
  });
});

describe('switcher visibility', () => {
  const css = style('site-header.css');
  const phoneMedia = mediaBlock(css, '@media (max-width: 768px)');

  test('exactly one switcher is displayed per breakpoint', () => {
    expect(stripBlocks(css, '@media (max-width: 768px)')).toMatch(
      /\.lang-switcher--phone\s*{[^}]*display:\s*none;/
    );
    expect(phoneMedia).toMatch(/\.lang-switcher--phone\s*{[^}]*display:\s*flex;/);
    expect(phoneMedia).toMatch(/\.lang-switcher--desktop\s*{[^}]*display:\s*none;/);
  });

  test('neighbouring language links keep at least 8px', () => {
    expect(css).toMatch(/\.lang-switcher\s*{[^}]*gap:\s*var\(--space-2\);/);
  });
});

describe('interaction state recipe', () => {
  const owned = [
    'buttons.css',
    'nav-toggle.css',
    'site-header.css',
    'recruiter-action-bar.css',
    'project-deep-dive.css',
  ];

  test.each(owned)('%s applies :hover only under (hover: hover)', (file) => {
    const css = style(file);
    expect(stripBlocks(css, '@media (hover: hover)')).not.toContain(':hover');
    expect(css).toContain(':hover');
  });

  test.each(owned)('%s pressed states apply without a transition delay', (file) => {
    const css = style(file);
    const pressed = [...css.matchAll(/:active\s*{[^}]*}/g)].map((match) => match[0]);
    expect(pressed.length).toBeGreaterThan(0);
    expect(pressed.join('\n')).toMatch(/transition-duration:\s*0s/);
  });

  test('control edges use the control border token', () => {
    expect(style('nav-toggle.css')).toMatch(/border:\s*1px solid var\(--border-control\)/);
    expect(style('buttons.css')).toMatch(
      /\.link-subtle,[^{]*{[^}]*border:\s*1px solid var\(--border-control\)/
    );
    expect(style('recruiter-action-bar.css')).toMatch(
      /border:\s*1px solid var\(--border-control\)/
    );
    expect(style('site-header.css')).toMatch(
      /\.lang-link--active\s*{[^}]*border-color:\s*var\(--border-control\)/
    );
  });

  test('fill tokens sit directly after the control minimum', () => {
    const variables = style('variables.css');
    const control = variables.indexOf('--control-min: 44px;');
    expect(control).toBeGreaterThan(0);
    expect(variables.indexOf('--state-hover-fill:')).toBeGreaterThan(control);
    expect(variables.indexOf('--state-pressed-fill:')).toBeGreaterThan(control);
  });
});

describe('shared tooltip mechanism', () => {
  const css = style('tooltip.css');

  test('renders the accessible name without changing it', () => {
    expect(css).toMatch(/\[data-tooltip\]::after\s*{[^}]*content:\s*attr\(aria-label\);/);
  });

  test('shows on pointer hover only where hover exists, and on keyboard focus', () => {
    expect(stripBlocks(css, '@media (hover: hover)')).not.toContain(':hover');
    expect(css).toMatch(/\[data-tooltip\]:focus-visible::after/);
  });

  test('is imported once and has a forced-colors treatment', () => {
    expect(style('main.css').match(/tooltip\.css/g)).toHaveLength(1);
    expect(stripBlocks(style('contrast-modes.css'), '@media (prefers-contrast: more)')).toMatch(
      /forced-colors: active[\s\S]*\[data-tooltip\]::after/
    );
  });

  test.each([
    ['nav-toggle', 'index.html'],
    ['nav-toggle', 'index-en.html'],
  ])('%s opts in from the shell %s', (_name, file) => {
    expect(read(file)).toContain('data-tooltip');
  });

  test.each([
    ['ui.js', "'data-tooltip', 'above'"],
    ['project-deep-dive-overlay.js', "'data-tooltip', ''"],
    ['recruiter-mobile-actions.js', "'data-tooltip', 'above'"],
  ])('%s marks its icon-only control', (file, needle) => {
    expect(read('src', 'scripts', 'modules', file)).toContain(needle);
  });
});

describe('deep-dive dialog layout', () => {
  const css = style('project-deep-dive.css');

  test('close control is sticky inside a clipping, non-scrolling panel', () => {
    expect(css).toMatch(/\.deep-dive-close\s*{[^}]*position:\s*sticky;/);
    expect(css).toMatch(/\.deep-dive-panel\s*{[^}]*overflow:\s*clip;/);
    expect(css).toMatch(/\.deep-dive-close\s*{[^}]*width:\s*var\(--control-min\);/);
    expect(css).toMatch(/env\(safe-area-inset-top\)/);
  });

  test('a localized period word uses the label face', () => {
    expect(css).toMatch(
      /\.deep-dive-header__period-word\s*{[^}]*font-family:\s*var\(--font-label\);/
    );
  });

  test('visibility switches on instantly when opening so focus can move once', () => {
    expect(css).toMatch(/\.deep-dive-overlay\.active\s*{[^}]*visibility 0s/);
  });
});
