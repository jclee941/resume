const fs = require('fs');
const path = require('path');
const { generateCoverLetterSection } = require('../../../apps/portfolio/lib/cards/cover-letter');

describe('cover-letter fold', () => {
  const root = path.join(__dirname, '../../..');
  const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

  test('the server renders every paragraph without hiding any', () => {
    const paragraphs = ['one', 'two', 'three', 'four', 'five'];
    const html = generateCoverLetterSection({ headline: 'headline', paragraphs, closing: 'end' });
    expect(html.match(/class="cover-letter__para"/g)).toHaveLength(paragraphs.length);
    expect(html).not.toMatch(/\shidden[\s>=]/);
  });

  test('the bootstrap initializes the fold exactly once', () => {
    const main = read('apps/portfolio/src/scripts/main.js');
    expect(main.match(/^\s+initCoverLetterFold,$/gm)).toHaveLength(1);
  });

  test('the fold is gated on the script-enabled flag and the paragraphs never use hidden', () => {
    const css = read('apps/portfolio/src/styles/cover-letter-paragraphs.css');
    expect(css).toMatch(/html\.js\s+\.cover-letter__paragraphs\[data-fold\]:not\(\.is-expanded\)/);
    expect(css).not.toMatch(/\[hidden\]/);
    expect(read('apps/portfolio/src/scripts/modules/cover-letter-fold.js')).not.toMatch(/hidden/);
  });

  test('print output shows folded paragraphs and drops the toggle', () => {
    const print = read('apps/portfolio/src/styles/print.css');
    expect(print).toMatch(/\.cover-letter__para\[hidden\]\s*\{\s*display:\s*grid !important;/);
    expect(print).toMatch(/\.cover-letter__toggle,/);
  });
});
