const fs = require('fs');
const path = require('path');

/**
 * About 2-column declutter contract.
 *
 * The About section stacked four full-width cards vertically (narrative,
 * expertise/competencies, profile bento, achievements) — a "wall". The narrative
 * (.about-content) and the expertise block are paired side-by-side in an
 * `.about-grid` (2-col desktop / 1-col mobile). Bento + achievements stay
 * full-width below. No content is removed: all item counts are preserved.
 */
describe('about grid: narrative + expertise paired without losing content', () => {
  const root = path.join(__dirname, '../../..');
  const workerPath = path.join(root, 'apps/portfolio/worker.js');
  let worker;
  beforeAll(() => {
    worker = fs.readFileSync(workerPath, 'utf8');
  });

  function count(haystack, needle) {
    return haystack.split(needle).length - 1;
  }

  test('the about-grid wrapper renders once per locale (KO/EN/JA = 3)', () => {
    expect(count(worker, 'class="about-grid"')).toBe(3);
  });

  test('about-content and expertise-block still render once per locale', () => {
    expect(count(worker, 'class="about-content"')).toBe(3);
    expect(count(worker, 'class="expertise-block"')).toBe(3);
  });

  test('profile bento + achievements remain present once per locale', () => {
    expect(count(worker, 'class="profile-bento"')).toBe(3);
    expect(count(worker, 'class="achievements-block"')).toBe(3);
  });

  test('career-highlights narrative is preserved (single localized block per locale)', () => {
    expect(count(worker, 'about-label">경력 하이라이트<')).toBe(1);
    expect(count(worker, 'about-label">Career highlights<')).toBe(1);
    expect(count(worker, 'about-label">経歴ハイライト<')).toBe(1);
  });
});
