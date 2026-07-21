const { test, expect } = require('@playwright/test');

const CASES = [
  { locale: 'ko', path: '/ko/', tokens: ['프로파일', '문제를', '엔드포인트', '낮췄습니다', 'Splunk', 'MCP'] },
  { locale: 'ja', path: '/ja/', tokens: ['セキュリティ', '整理しました', '(株)ガオンヌリ'] },
];

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
];

async function inspectWrapping(page, tokens) {
  return page.evaluate((expectedTokens) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const lineTop = (node, index) => {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      return rect.width || rect.height ? Math.round(rect.top * 2) / 2 : null;
    };

    const tokenLines = Object.fromEntries(
      expectedTokens.map((token) => {
        const counts = [];
        for (const node of textNodes) {
          let start = node.data.indexOf(token);
          while (start !== -1) {
            const tops = new Set();
            for (let index = start; index < start + token.length; index += 1) {
              const top = lineTop(node, index);
              if (top !== null) tops.add(top);
            }
            if (tops.size) counts.push(tops.size);
            start = node.data.indexOf(token, start + token.length);
          }
        }
        return [token, counts];
      })
    );

    const forbiddenLineStart = /^[、。，．）」』】〉》〕］｝!！?？ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]/u;
    const kinsokuViolations = [];
    for (const node of textNodes) {
      const lines = new Map();
      for (let index = 0; index < node.data.length; index += 1) {
        const top = lineTop(node, index);
        if (top === null) continue;
        lines.set(top, `${lines.get(top) || ''}${node.data[index]}`);
      }
      const renderedLines = [...lines.values()].map((line) => line.trim()).filter(Boolean);
      for (let index = 1; index < renderedLines.length; index += 1) {
        if (forbiddenLineStart.test(renderedLines[index])) {
          kinsokuViolations.push(renderedLines.slice(Math.max(0, index - 1), index + 1));
        }
      }
    }

    return { tokenLines, kinsokuViolations };
  }, tokens);
}

for (const viewport of VIEWPORTS) {
  for (const scenario of CASES) {
    test(`${scenario.locale} ${viewport.width}px keeps CJK phrases and kinsoku intact`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(scenario.path, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);

      const result = await inspectWrapping(page, scenario.tokens);
      for (const [token, lineCounts] of Object.entries(result.tokenLines)) {
        expect(lineCounts.length, `${token} must be rendered`).toBeGreaterThan(0);
        expect(Math.max(...lineCounts), `${token} must not split across visual lines`).toBe(1);
      }
      if (scenario.locale === 'ja') {
        expect(result.kinsokuViolations, 'Japanese closing punctuation or small kana at line start').toEqual([]);
      }
    });
  }
}
