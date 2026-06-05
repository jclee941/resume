const fs = require('fs');
const path = require('path');

/**
 * De-collapse contract: the cover letter shows all 5 paragraphs by default.
 *
 * The cover-letter-collapse enhancement hid paragraphs 2..n behind a "전체 보기 /
 * read full" toggle. Users read the default-collapsed state as "paragraphs are
 * missing", so the feature is removed entirely: all paragraphs render visible,
 * no toggle button, no `[hidden]` collapse CSS. Full text already lives in the
 * DOM (cover-letter.js renders every paragraph), so removal is content-safe.
 */
describe('cover-letter de-collapse: collapse feature fully removed', () => {
  const root = path.join(__dirname, '../../..');
  const mainPath = path.join(root, 'apps/portfolio/src/scripts/main.js');
  const collapseModulePath = path.join(
    root,
    'apps/portfolio/src/scripts/modules/cover-letter-collapse.js'
  );
  const cssPath = path.join(root, 'apps/portfolio/src/styles/cover-letter.css');
  const cardPath = path.join(root, 'apps/portfolio/lib/cards/cover-letter.js');
  const workerPath = path.join(root, 'apps/portfolio/worker.js');

  let mainSrc;
  let cssSrc;
  let cardSrc;
  let worker;
  beforeAll(() => {
    mainSrc = fs.readFileSync(mainPath, 'utf8');
    cssSrc = fs.readFileSync(cssPath, 'utf8');
    cardSrc = fs.readFileSync(cardPath, 'utf8');
    worker = fs.readFileSync(workerPath, 'utf8');
  });

  function count(haystack, needle) {
    return haystack.split(needle).length - 1;
  }

  test('main.js no longer imports or bootstraps the collapse enhancement', () => {
    expect(mainSrc).not.toMatch(/initCoverLetterCollapse/);
    expect(mainSrc).not.toMatch(/cover-letter-collapse/);
  });

  test('the cover-letter-collapse module file is deleted', () => {
    expect(fs.existsSync(collapseModulePath)).toBe(false);
  });

  test('the collapse toggle button class is absent from CSS and bundle', () => {
    expect(cssSrc).not.toMatch(/cover-letter__toggle/);
    expect(count(worker, 'cover-letter__toggle')).toBe(0);
  });

  test('the [hidden] collapse rule for paragraphs is removed', () => {
    expect(cssSrc).not.toMatch(/\.cover-letter__para\[hidden\]/);
  });

  test('the card renderer still emits every paragraph (no slice / no collapse hiding)', () => {
    // Renderer maps the full paragraphs array — no truncation, no p.hidden.
    // (aria-hidden on decorative spans is legitimate and must remain.)
    expect(cardSrc).not.toMatch(/\.slice\(/);
    expect(cardSrc).not.toMatch(/\.hidden\s*=/);
    expect(cardSrc).not.toMatch(/\[hidden\]/);
  });

  test('the built bundle no longer contains the collapse module function name', () => {
    // Behavioral string from the deleted module (minify mangles identifiers,
    // but the localized toggle labels are string literals and survive).
    expect(count(worker, '커버레터 전체 보기')).toBe(0);
    expect(count(worker, 'Read full cover letter')).toBe(0);
    expect(count(worker, 'カバーレター全文')).toBe(0);
  });
});
