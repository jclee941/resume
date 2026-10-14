/**
 * @file Unit tests for localized-page-builder.js
 * @description Each locale page receives its own contact grid fragment.
 */

jest.mock('../../../../apps/portfolio/lib/html-transformer', () => ({
  buildJapaneseTemplate: jest.fn((html) => html),
  buildLocalizedHtml: jest.fn(async () => '<html></html>'),
  escapeForTemplateLiteral: jest.fn(),
}));

const { buildLocalizedHtml } = require('../../../../apps/portfolio/lib/html-transformer');
const { buildPortfolioPages } = require('../../../../apps/portfolio/lib/localized-page-builder');

describe('localized-page-builder', () => {
  it('passes the locale-specific contact grid to each page', async () => {
    await buildPortfolioPages({
      indexHtmlRaw: '<html lang="ko"></html>',
      indexEnHtmlRaw: '<html lang="en"></html>',
      cssContent: 'body{}',
      version: '1.0.0',
      buildDeployedAt: '2026-01-01T00:00:00.000Z',
      buildDeployedDate: '2026-01-01',
      templates: {
        contactGridHtml: '<nav>ko</nav>',
        contactGridEnHtml: '<nav>en</nav>',
        contactGridJaHtml: '<nav>ja</nav>',
      },
    });

    expect(buildLocalizedHtml.mock.calls.map(([, options]) => options.contactGridHtml)).toEqual([
      '<nav>ko</nav>',
      '<nav>en</nav>',
      '<nav>ja</nav>',
    ]);
  });
});
