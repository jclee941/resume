const fs = require('fs');
const path = require('path');

/**
 * Layout/content simplification contract: removes always-visible duplication.
 *
 * The About section rendered tech_philosophy / current_focus TWICE: once via
 * the data-driven `> tech_philosophy` / `> current_focus` blocks (from
 * aboutSection in the SSoT) and again via a hardcoded `about-principles`
 * block ("엔지니어링 원칙" / "Engineering Principles" + "현재 집중 영역" /
 * "Current Focus"). The hardcoded block is a pure duplicate and must be gone.
 */
describe('simplification: no duplicated About principles/focus block', () => {
  const workerPath = path.join(__dirname, '../../../apps/portfolio/worker.js');
  let worker;
  beforeAll(() => {
    worker = fs.readFileSync(workerPath, 'utf8');
  });

  function count(haystack, needle) {
    return haystack.split(needle).length - 1;
  }

  test('the hardcoded about-principles block is absent from all locales', () => {
    // The block had id="about-principles" (HTML only) and its now-dead CSS
    // selectors were removed too, so no occurrence should remain anywhere.
    expect(count(worker, 'about-principles')).toBe(0);
  });

  test('the duplicate Korean "엔지니어링 원칙" / "현재 집중 영역" headings are gone', () => {
    expect(count(worker, '엔지니어링 원칙')).toBe(0);
    expect(count(worker, '현재 집중 영역')).toBe(0);
  });

  test('the duplicate English "Engineering Principles" / "Current Focus" headings are gone', () => {
    expect(count(worker, 'Engineering Principles')).toBe(0);
    expect(count(worker, 'Current Focus')).toBe(0);
  });

  test('canonical data-driven tech_philosophy / current_focus blocks remain (once per locale = 3)', () => {
    expect(count(worker, '&gt; tech_philosophy')).toBe(3);
    expect(count(worker, '&gt; current_focus')).toBe(3);
  });
});
