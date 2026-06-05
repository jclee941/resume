/**
 * Static source contracts: the copy-email module must be wired through
 * ui.js initUI() (not a one-off inline handler) and the affordance must be
 * styled with theme tokens only (no hardcoded colors).
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../../apps/portfolio/src');
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

describe('contact-copy wiring + style contract', () => {
  test('ui.js imports and invokes initContactCopy', () => {
    const ui = read('scripts/modules/ui.js');
    expect(ui).toMatch(/import\s*{[^}]*initContactCopy[^}]*}\s*from\s*['"]\.\/contact-copy(\.js)?['"]/);
    expect(ui).toMatch(/initContactCopy\(/);
  });

  test('contact.css styles the copy affordance using CSS variables, no hardcoded hex', () => {
    const css = read('styles/contact.css');
    expect(css).toContain('contact-copy-status');
    // The new copied-state rule must use a var() token, never a raw hex color.
    const block = css.slice(css.indexOf('contact-copy-status'));
    // No 6/3-digit hex literal introduced in the copy-status styling block.
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
