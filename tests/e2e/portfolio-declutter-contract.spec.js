// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Declutter redesign CONTRACT.
 *
 * Encodes the clean dark-neutral layout, no terminal CLI, no neon/cyberpunk
 * chrome: ~7-8 sections, no junior gimmicks, no empty/placeholder sections,
 * calm hero, no skill progress bars, no repeated incident-stage rows, one
 * consolidated "operated" section.
 *
 * RED first against the current cluttered page; GREEN after the redesign.
 */

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

test.describe('Declutter — removed gimmick sections', () => {
  test('S1: junk sections are gone', async ({ page }) => {
    await go(page, '/');
    for (const id of ['status', 'observability', 'case-studies']) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
  });

  test('S1: section count is lean (<= 9 content sections)', async ({ page }) => {
    await go(page, '/');
    const n = await page.locator('main section[id]').count();
    expect(n).toBeLessThanOrEqual(9);
  });
});

test.describe('Declutter — gimmick markup/commands absent', () => {
  test('S2: no easter-egg DOM overlays', async ({ page }) => {
    await go(page, '/');
    for (const sel of [
      '.hack-mode-overlay',
      '.snake-game-overlay',
      '.mission-control',
      '.mc-status-bar',
      '.chat-widget',
      '.section-guestbook',
    ]) {
      await expect(page.locator(sel)).toHaveCount(0);
    }
  });

  test('S2: no ops-dashboard placeholder stats (--)', async ({ page }) => {
    await go(page, '/');
    const dashes = await page
      .locator('.stat-value, .observability-stat .stat-value')
      .filter({ hasText: '--' })
      .count();
    expect(dashes).toBe(0);
  });
});

test.describe('Declutter — terminal CLI and chrome absent', () => {
  test('S3: terminal CLI, commands, and cyberpunk chrome are removed', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#cli-container, #terminal-input, #cli-output')).toHaveCount(0);
    expect(await page.evaluate(() => 'terminalCommands' in window)).toBe(false);
    await expect(page.locator('.terminal-window, .terminal-titlebar, .section-cmd')).toHaveCount(0);
  });

  test('S3: clean hero has one title and no typing/KPI/status gimmicks', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#hero .hero-title')).toHaveCount(1);
    await expect(page.locator('#hero .typing-effect')).toHaveCount(0);
    await expect(page.locator('#hero .cursor')).toHaveCount(0);
    await expect(page.locator('#hero .hero-kpi-grid')).toHaveCount(0);
    await expect(page.locator('#hero .status-seeking')).toHaveCount(0);
  });
});

test.describe('Declutter — skills have no progress bars', () => {
  test('S4: no skill progress bars or percent proficiency', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#skills .skill-item__bar')).toHaveCount(0);
    const pct = await page
      .locator('#skills')
      .evaluate((el) => /\b\d{1,3}\s?%/.test(el.textContent || ''));
    expect(pct).toBe(false);
  });
});

test.describe('Declutter — experience has no repeated incident-stage rows', () => {
  test('S5: incident-stage icon rows removed', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#resume .incident-stage')).toHaveCount(0);
  });
});

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
