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
    expect(main.match(/initCoverLetterFold\(\)/g)).toHaveLength(1);
  });

  test('print output shows folded paragraphs and drops the toggle', () => {
    const print = read('apps/portfolio/src/styles/print.css');
    expect(print).toMatch(/\.cover-letter__para\[hidden\]\s*\{\s*display:\s*grid !important;/);
    expect(print).toMatch(/\.cover-letter__toggle,/);
  });
});
