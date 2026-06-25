const fs = require('fs');
const path = require('path');

/**
 * Guards the WCAG-contrast regression where the page background gradient is a
 * background-IMAGE, which resets computed background-color to transparent.
 * Light hero text then has no opaque ancestor backdrop for contrast
 * resolution. The body rule must keep an explicit opaque `background-color`
 * base. Additionally, every CSS custom property the body background references
 * MUST be defined in the committed variables.css (a reference to an undefined
 * token silently breaks the background in a clean checkout / production).
 *
 * Depends only on committed source (apps/portfolio/src/styles/*.css).
 */
describe('body background contrast contract', () => {
  const stylesDir = path.join(__dirname, '../../../apps/portfolio/src/styles');
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
  const variablesCss = fs.readFileSync(path.join(stylesDir, 'variables.css'), 'utf8');
  const bodyRule = (baseCss.match(/\bbody\s*{[^}]*}/) || [''])[0];

  test('body keeps an opaque background-color base under the gradient', () => {
    expect(bodyRule).toBeTruthy();
    expect(bodyRule).toContain('background-color: var(--bg-primary);');
  });

  test('every CSS var referenced by the body background is defined in variables.css', () => {
    const bgDecls = bodyRule.match(/background(?:-color)?:[^;]+;/g) || [];
    const referenced = new Set();
    for (const decl of bgDecls) {
      for (const m of decl.matchAll(/var\((--[\w-]+)\)/g)) {
        referenced.add(m[1]);
      }
    }
    const undefinedVars = [...referenced].filter((name) => !variablesCss.includes(`${name}:`));
    expect(undefinedVars).toEqual([]);
  });
});
