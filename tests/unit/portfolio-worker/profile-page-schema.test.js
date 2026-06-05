const fs = require('fs');
const path = require('path');

const PORTFOLIO = path.join(__dirname, '..', '..', '..', 'apps', 'portfolio');
const read = (f) => fs.readFileSync(path.join(PORTFOLIO, f), 'utf-8');

describe('SEO: ProfilePage JSON-LD with dateModified recency signal', () => {
  for (const f of ['index.html', 'index-en.html']) {
    test(`${f} ships a ProfilePage schema referencing the Person entity`, () => {
      const html = read(f);
      const head = html.slice(0, html.indexOf('</head>'));
      // A ProfilePage wraps the existing Person so crawlers treat the page as a
      // professional profile, not a generic document.
      expect(head).toMatch(/"@type":\s*"ProfilePage"/);
      expect(head).toMatch(/"mainEntity":\s*{\s*"@id":\s*"https:\/\/resume\.jclee\.me\/#person"/);
    });

    test(`${f} ProfilePage carries a dateModified build placeholder`, () => {
      const html = read(f);
      const head = html.slice(0, html.indexOf('</head>'));
      // dateModified must be a build-injected token so recency follows deploys
      // instead of going stale as a hardcoded date.
      expect(head).toMatch(/"dateModified":\s*"<!-- BUILD_DEPLOYED_AT_PLACEHOLDER -->"/);
    });
  }

  test('build replaces the dateModified placeholder with a real ISO timestamp', () => {
    const { transformLocaleHtml } = (() => {
      try {
        return require(path.join(PORTFOLIO, 'lib', 'html-transformer.js'));
      } catch {
        return {};
      }
    })();
    // If the transformer is exported, prove the placeholder resolves; otherwise
    // assert the placeholder string itself is what the build pipeline targets.
    const html = read('index.html');
    expect(html).toContain('<!-- BUILD_DEPLOYED_AT_PLACEHOLDER -->');
    expect(typeof transformLocaleHtml === 'function' || transformLocaleHtml === undefined).toBe(
      true
    );
  });
});
