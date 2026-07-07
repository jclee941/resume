/**
 * Visual polish contract (2026-07-07 visual review):
 * - The skip-link must hide itself height-independently. `top: -40px` left an
 *   ~8px teal sliver visible at the top-left on every page because the
 *   tap-target rule forces the link to 48px tall. A transform-based hide
 *   (translateY(-110%)) stays correct regardless of computed height.
 * - The contact grid must not render as six sparse full-width bars on
 *   desktop; it switches to a multi-column grid at the desktop breakpoint.
 */
const fs = require('fs');
const path = require('path');

const STYLES = path.resolve(__dirname, '../../../apps/portfolio/src/styles');

function read(fileName) {
  return fs.readFileSync(path.join(STYLES, fileName), 'utf8');
}

describe('visual polish: skip-link hide is height-independent', () => {
  test('skip-link uses translateY off-screen hide, not fixed negative top', () => {
    const css = read('utilities.css');
    const block = css.slice(css.indexOf('.skip-link {'), css.indexOf('.skip-link:focus'));
    expect(block).toMatch(/transform:\s*translateY\(-1\d0%\)/);
    expect(block).not.toMatch(/^\s*top:\s*-40px/m);
  });

  test('skip-link focus state restores on-screen position', () => {
    const css = read('utilities.css');
    const focusBlock = css.slice(css.indexOf('.skip-link:focus'));
    expect(focusBlock).toMatch(/transform:\s*translateY\(0\)/);
  });
});

describe('visual polish: contact grid density on desktop', () => {
  test('contact grid becomes multi-column at the desktop breakpoint', () => {
    const css = read('contact.css');
    expect(css).toMatch(/@media\s*\(min-width:\s*768px\)/);
    const mediaBlock = css.slice(css.indexOf('@media (min-width: 768px)'));
    expect(mediaBlock).toMatch(/\.contact-grid\s*\{[^}]*grid/);
  });
});
