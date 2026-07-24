const { test, expect } = require('@playwright/test');

const { extractPageOccurrences } = require('./fixtures/public-copy-ledger-extractor');
const DESKTOP = { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 };

test('DOM and accessible extraction share rendered visibility', async ({ page }) => {
  await page.setContent(`
    <button id="visible">Visible control</button>
    <button id="collapsed" style="visibility:collapse">Collapsed control</button>
    <button id="content-hidden" style="content-visibility:hidden">Content hidden control</button>
    <button id="zero-area" style="width:0;height:0;padding:0;border:0;font-size:0">Zero area control</button>
    <div hidden><button id="ancestor-hidden">Ancestor hidden control</button></div>
  `);
  const rows = await extractPageOccurrences(page, {
    locale: 'en',
    route: '/en/',
    state: 'visibility-contract',
    viewport: DESKTOP,
  });
  for (const kind of ['dom-text', 'accessible-tree']) {
    const values = rows
      .filter((row) => row.kind === kind)
      .map((row) => row.value)
      .join('\n');
    expect(values).toContain('Visible control');
    for (const hidden of ['Collapsed', 'Content hidden', 'Zero area', 'Ancestor hidden'])
      expect(values).not.toContain(`${hidden} control`);
  }
});
