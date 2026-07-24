// @ts-check
const { test, expect } = require('@playwright/test');

/** @param {import('@playwright/test').Page} page */
async function go(page, url = '/') {
  const r = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!r || r.status() >= 500) test.skip(true, 'server unavailable');
  // trigger scroll-reveal across the whole page
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((res) => setTimeout(res, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

test.describe('Declutter — consolidated operated section + regression', () => {
  test('S6: a single consolidated ops/operated section exists', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#operated')).toHaveCount(1);
  });

  test('S6: /ja/ operated section is fully localized (no Korean leakage)', async ({ page }) => {
    await go(page, '/ja/');
    await expect(page.locator('#operated')).toHaveCount(1);
    const txt = (await page.locator('#operated').textContent()) || '';
    // Korean operated-card strings must be replaced in the JA build.
    expect(txt).not.toContain('응답 헤더로 적용합니다');
    expect(txt).not.toContain('대시보드 기반으로 상태를 검토합니다');
    expect(txt).not.toContain('코드로 관리합니다');
    // JA copy present.
    expect(txt).toMatch(/レスポンスヘッダー|可観測性|デプロイ/);
  });

  for (const loc of ['/ja/', '/en/']) {
    test(`S6: ${loc} full page has no Korean leakage in visible copy`, async ({ page }) => {
      await go(page, loc);
      // Visible body text only — excludes <script> data blocks and code-fenced
      // technology names; asserts no Hangul leaks into localized copy.
      const koRuns = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const hits = [];
        const hangul = /[\uac00-\ud7a3]{2,}/;
        let n;
        while ((n = walker.nextNode())) {
          const p = n.parentElement;
          if (!p) continue;
          if (p.closest('script, style, code, pre')) continue;
          const t = (n.textContent || '').trim();
          if (hangul.test(t)) hits.push(t.slice(0, 60));
        }
        return hits;
      });
      expect(koRuns).toEqual([]);
    });
  }

  test('S6: timeline phase badges are distinct per locale (no fallback collapse)', async ({
    page,
  }) => {
    // CAREER_UI_META is keyed by locale-stable `period`; a regression that keys
    // by localized `company` collapses every EN/JA badge to the default phase.
    /**
     * @param {string} url
     * @param {string[]} expected
     */
    const phasesFor = async (url, expected) => {
      await go(page, url);
      const badges = await page
        .locator('.phase-badge')
        .evaluateAll((els) =>
          els
            .map((e) => (e.textContent || '').replace(/[^\p{L}\p{N}]/gu, '').trim())
            .filter(Boolean)
        );
      expect(badges).toEqual(expected);
    };
    await phasesFor('/ja/', ['運用', '構築', '安定化', '構築', '自動化', '基礎']);
    await phasesFor('/en/', ['Operate', 'Build', 'Stabilize', 'Build', 'Automate', 'Foundation']);
  });

  for (const loc of ['/', '/en/', '/ja/']) {
    test(`S6: ${loc} visible copy has no forbidden quantified metrics`, async ({ page }) => {
      await go(page, loc);
      // Benchmark rule: no fabricated performance metrics or absolute impact counts
      // in visible copy. Allowed facts (tenure years, cert dates, 5-tier
      // segmentation) are not matched by these patterns.
      const hits = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const bad = [];
        const pats = [
          /\d+\s*\uD68C/, // N\uD68C (N times)
          /\d+\s*%/,
          /\d+\s*\uBC30/, // N\uBC30 (N-fold)
          /\b\d+x\b/i,
          /\d+\s*ms\b/,
          /~?\s*\d+\s*KB\b/,
          /~?\s*\d+\s*MB\b/,
          /\d+\s*\uAC74/, // N\uAC74 (N items, impact count)
        ];
        let n;
        while ((n = walker.nextNode())) {
          const p = n.parentElement;
          if (!p) continue;
          if (p.closest('script, style, code, pre')) continue;
          const t = (n.textContent || '').trim();
          if (!t) continue;
          if (pats.some((re) => re.test(t))) bad.push(t.slice(0, 70));
        }
        return bad;
      });
      expect(hits).toEqual([]);
    });
  }

  test('S7 (regression): cover-letter + project cards still render; no mobile overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, '/');
    await expect(page.locator('#cover-letter .cover-letter-card')).toHaveCount(1);
    const cards = await page
      .locator('#projects #project-list .project-card, #projects .project-card')
      .count();
    expect(cards).toBeGreaterThan(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });

  test('S7 (regression): no dead internal nav links', async ({ page }) => {
    await go(page, '/');
    const hrefs = await page
      .locator('a[href^="#"]')
      .evaluateAll((els) =>
        els.map((a) => a.getAttribute('href')).filter((h) => h && h.length > 1)
      );
    for (const h of hrefs) {
      if (!h) continue;
      const id = h.slice(1);
      const targetCount = await page.evaluate((targetId) => {
        return document.getElementById(targetId) ? 1 : 0;
      }, id);
      expect(targetCount).toBe(1);
    }
  });
});
