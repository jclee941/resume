const { escapeHtml } = require('../../apps/portfolio/lib/template-sanitizer');

const HOSTILE = 'Quote " amp & lt < gt > backslash \\ dollar $& $1 $$ tail';
const HOSTILE_NAME = 'A"&<\\$&B';
const identity = { nameKo: 'Example', nameJa: HOSTILE_NAME, nameEn: 'Given Family', email: '' };

const SHELL = [
  '<html lang="ko"><head><title>Example</title>',
  '<meta name="description" content="old" />',
  '<meta name="keywords" content="old" />',
  '<meta name="author" content="old" />',
  '<meta property="og:title" content="old" />',
  '<meta property="og:description" content="old" />',
  '<meta name="twitter:title" content="old" />',
  '<meta name="twitter:description" content="old" />',
  '<script type="application/ld+json">',
  '{"@type": "Person", "name": "Example", "description": "old"}',
  '</script>',
  '<script type="application/ld+json">',
  '{"@type": "WebSite", "name": "Example - Security & Infrastructure Engineer", "description": "old"}',
  '</script>',
  '</head></html>',
].join('\n');

function applyWithPack(metaDescription) {
  let html;
  jest.isolateModules(() => {
    jest.doMock('../../apps/portfolio/lib/hero-content-data', () => ({
      HERO_CONTENT: { ja: { metaDescription } },
    }));
    html = require('../../apps/portfolio/lib/japanese-template/meta').applyJapaneseMeta(
      SHELL,
      identity
    );
    jest.dontMock('../../apps/portfolio/lib/hero-content-data');
  });
  return html;
}

describe('applyJapaneseMeta escapes identity and content-pack values', () => {
  const html = applyWithPack(HOSTILE);
  const expectedDescription = `${identity.nameJa} — Security & Infrastructure Engineer ポートフォリオ。${HOSTILE}`;

  test('meta content attributes and title hold HTML-escaped text', () => {
    const escapedDescription = `${escapeHtml(identity.nameJa)} — Security & Infrastructure Engineer ポートフォリオ。${escapeHtml(HOSTILE)}`;
    for (const key of [
      'name="description"',
      'property="og:description"',
      'name="twitter:description"',
    ]) {
      expect(html).toContain(`<meta ${key} content="${escapedDescription}" />`);
    }
    const escapedTitle = `${escapeHtml(identity.nameJa)} - Security & Infrastructure Engineer`;
    expect(html).toContain(`<title>${escapedTitle}</title>`);
    expect(html).toContain(`<meta property="og:title" content="${escapedTitle}" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${escapedTitle}" />`);
    expect(html).toContain(
      `<meta name="keywords" content="${escapeHtml(identity.nameJa)}, Family Given, `
    );
    expect(html).toContain(
      `<meta name="author" content="${escapeHtml(identity.nameJa)} (Family Given)" />`
    );
    expect(html).not.toContain(HOSTILE);
  });

  test('every ld+json block parses and returns the original strings', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks).toHaveLength(2);
    const [person, site] = blocks.map((match) => JSON.parse(match[1]));
    expect(person.description).toBe(expectedDescription);
    expect(site.description).toBe(expectedDescription);
    expect(site.name).toBe(`${identity.nameJa} - Security & Infrastructure Engineer`);
    expect(blocks.map((match) => match[1]).join('')).not.toContain('<');
  });

  test('JSON-LD name uses the Japanese name verbatim after parsing', () => {
    const shell = '<script type="application/ld+json">{"name": "Example"}</script>';
    let out;
    jest.isolateModules(() => {
      jest.doMock('../../apps/portfolio/lib/hero-content-data', () => ({
        HERO_CONTENT: { ja: {} },
      }));
      out = require('../../apps/portfolio/lib/japanese-template/meta').applyJapaneseMeta(
        shell,
        identity
      );
      jest.dontMock('../../apps/portfolio/lib/hero-content-data');
    });
    const json = out.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
    expect(JSON.parse(json).name).toBe(identity.nameJa);
  });
});
