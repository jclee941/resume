const fs = require('fs');
const path = require('path');

describe('section stylesheets: progressive enhancement, state recipe, reading sizes', () => {
  const stylesDir = path.join(__dirname, '../../apps/portfolio/src/styles');
  const css = (name) => fs.readFileSync(path.join(stylesDir, name), 'utf8');
  const rule = (source, selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? null;
  };

  test.each([
    ['timeline-details.css', 'html.js .timeline-node:not(.is-expanded) .timeline-details'],
    [
      'timeline-card.css',
      'html.js .incident-timeline:not(.is-older-visible) .timeline-node--older',
    ],
    [
      'project-more.css',
      'html.js .project-list:not(.is-expanded) .project-item--collapsed:not(.is-role-match)',
    ],
  ])('%s hides collapsed content only under html.js', (file, selector) => {
    expect(rule(css(file), selector)).toMatch(/display:\s*none/);
  });

  test('no unscoped rule hides collapsed timeline, project or cover-letter content', () => {
    const collapsed =
      /timeline-details|timeline-node--older|project-item--collapsed|cover-letter__para/;
    for (const file of [
      'timeline-details.css',
      'timeline-card.css',
      'project-more.css',
      'cover-letter-paragraphs.css',
    ]) {
      for (const [, selector, body] of css(file).matchAll(
        /(?:^|\n)\s*([^{}@\n][^{}]*)\{([^}]*)\}/g
      )) {
        if (collapsed.test(selector) && !selector.includes('html.js')) {
          expect(body).not.toMatch(/display:\s*none/);
        }
      }
    }
    expect(css('cover-letter-paragraphs.css')).not.toMatch(/\[hidden\]/);
  });

  test('disclosure controls stay hidden until the script-enabled flag marks them usable', () => {
    expect(rule(css('project-more.css'), '.project-more,\n.timeline-more')).toMatch(
      /display:\s*none/
    );
    expect(rule(css('project-more.css'), 'html.js .project-more,\nhtml.js .timeline-more')).toMatch(
      /display:\s*flex/
    );
    expect(rule(css('timeline-details.css'), '.timeline-expand-btn')).toMatch(/display:\s*none/);
    expect(rule(css('timeline-details.css'), 'html.js .timeline-expand-btn')).toMatch(
      /display:\s*inline-flex/
    );
  });

  test.each([
    ['project-more.css', '.project-more-btn,\n.timeline-more-btn,\n.cover-letter__toggle'],
    ['timeline-details.css', '.timeline-expand-btn'],
    ['recruiter-role-chips.css', '.role-chip'],
  ])('%s: %s edge uses the control-edge token', (file, selector) => {
    expect(rule(css(file), selector)).toMatch(/border(?:-color)?:[^;]*var\(--border-control\)/);
  });

  test('hover lives under (hover: hover) with the shared state tokens; pressed is instant', () => {
    const more = css('project-more.css');
    const hover = /@media \(hover: hover\) \{([\s\S]*?)\n\}/.exec(more)[1];
    expect(hover).toMatch(/border-color:\s*var\(--state-hover-border\)/);
    expect(hover).toMatch(/background:\s*var\(--state-hover-bg\)/);
    expect(more).not.toMatch(/^\.project-more-btn:hover/m);
    const pressed = /\.project-more-btn:active[\s\S]*?\{([^}]*)\}/.exec(more)[1];
    expect(pressed).toMatch(/background:\s*var\(--state-pressed-bg\)/);
    expect(pressed).toMatch(/transition-duration:\s*0s/);

    const chips = css('recruiter-role-chips.css');
    expect(chips).toMatch(/@media \(hover: hover\) \{[\s\S]*?\.role-chip:not\(:disabled\):hover/);
    expect(chips).toMatch(/\.role-chip:not\(:disabled\):active\s*\{[^}]*var\(--state-pressed-bg\)/);

    const grid = css('project-case-study-grid.css');
    expect(grid).toMatch(/@media \(hover: hover\) \{[\s\S]*?\.project-card:hover/);
    expect(grid).toMatch(
      /:has\(\.project-card__launcher:active\)\s*\{[^}]*var\(--state-pressed-bg\)/
    );
  });

  test('timeline, cover-letter and case-study prose use the phone reading tokens', () => {
    const card = css('timeline-card.css');
    expect(rule(card, '.timeline-highlights,\n.timeline-summary')).toMatch(
      /font-size:\s*var\(--text-prose-compact\)/
    );
    const details = css('timeline-details.css');
    expect(rule(details, '.details-description')).toMatch(
      /font-size:\s*var\(--text-prose-compact\)/
    );
    expect(rule(details, '.details-achievements li')).toMatch(
      /font-size:\s*var\(--text-prose-compact\)/
    );
    expect(rule(css('cover-letter-paragraphs.css'), '.cover-letter__text')).toMatch(
      /font-size:\s*var\(--text-prose\)/
    );
    expect(rule(css('project-case-study-grid.css'), '.case-study-deep-dives__description')).toMatch(
      /font-size:\s*var\(--text-support\)/
    );
  });

  test('expanded prose is capped at the shared measure without touching card edges', () => {
    const details = css('timeline-details.css');
    expect(rule(details, '.details-description')).toMatch(/max-width:\s*var\(--measure-prose\)/);
    expect(rule(details, '.details-achievements')).toMatch(/max-width:\s*var\(--measure-prose\)/);
    expect(rule(details, '.timeline-details') ?? '').not.toMatch(/max-width/);
    expect(rule(css('project-case-study-grid.css'), '.case-study-deep-dives__description')).toMatch(
      /max-width:\s*var\(--measure-prose\)/
    );
  });

  test('linked company names pad their hit area beyond the glyph with compensating margin', () => {
    const card = css('timeline-card.css');
    expect(rule(card, 'a.company-link')).toMatch(/padding:\s*var\(--target-slop\)/);
    expect(rule(card, 'a.company-link')).toMatch(/margin:\s*calc\(-1 \* var\(--target-slop\)\)/);
    const coarse = /@media \(pointer: coarse\) \{([\s\S]*?)\n\}/.exec(card)[1];
    expect(coarse).toMatch(/padding-block:\s*calc\(\(var\(--control-min\) - 1lh\) \/ 2\)/);
    expect(coarse).toMatch(/margin-block:\s*calc\(\(var\(--control-min\) - 1lh\) \/ -2\)/);
  });

  test('localized words in a case-study period use the label face, not mono', () => {
    const content = css('project-case-study-card-content.css');
    expect(rule(content, '.project-card__period')).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(rule(content, '.project-card__period-word')).toMatch(
      /font-family:\s*var\(--font-label\)/
    );
  });

  test('role chips reserve the count slot so filling it never changes their height', () => {
    const chips = css('recruiter-role-chips.css');
    expect(rule(chips, '.role-chip__count::after')).toMatch(/content:\s*attr\(data-sizer\)/);
    expect(rule(chips, '.role-chip__count::before')).toMatch(/content:\s*'\\200b'/);
  });

  test('the control-target token is defined exactly once', () => {
    expect(css('variables.css').match(/--target-slop:\s*0\.625rem;/g) || []).toHaveLength(1);
  });
});
