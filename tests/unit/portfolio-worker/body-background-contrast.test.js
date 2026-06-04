const fs = require('fs');
const path = require('path');

/**
 * Guards the WCAG-contrast regression where the page background gradient
 * (`background: var(--gradient-page-atmosphere)`) is a background-IMAGE, which
 * resets computed background-color to transparent. Light hero text then has no
 * opaque ancestor backdrop for contrast resolution. The body rule must keep an
 * explicit opaque `background-color` base AFTER the gradient shorthand.
 *
 * Depends only on committed source (apps/portfolio/src/styles/base.css).
 */
describe('body background contrast contract', () => {
  const baseCssPath = path.join(
    __dirname,
    '../../../apps/portfolio/src/styles/base.css'
  );

  test('body keeps an opaque background-color base under the gradient', () => {
    const baseCss = fs.readFileSync(baseCssPath, 'utf8');
    const bodyRule = baseCss.match(/\bbody\s*{[^}]*}/);
    expect(bodyRule).toBeTruthy();
    expect(bodyRule[0]).toContain('background-color: var(--bg-primary);');
  });
});
