const { test, expect } = require('@playwright/test');

function parseRgb(color) {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}

function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fg, bg) {
  const l1 = 0.2126 * toLinear(fg.r) + 0.7152 * toLinear(fg.g) + 0.0722 * toLinear(fg.b);
  const l2 = 0.2126 * toLinear(bg.r) + 0.7152 * toLinear(bg.g) + 0.0722 * toLinear(bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Accessibility WCAG AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('text contrast should meet WCAG AA 4.5:1 for key UI text', async ({ page }) => {
    const selectors = ['.nav-link', '.section-title', '.contact-item'];

    for (const selector of selectors) {
      const ratio = await page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const transparent = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)']);
          const fg = window.getComputedStyle(el).color;

          let node = el;
          let bg = 'rgb(255, 255, 255)';
          while (node) {
            const candidate = window.getComputedStyle(node).backgroundColor;
            if (!transparent.has(candidate)) {
              bg = candidate;
              break;
            }
            if (!node.parentElement) {
              break;
            }
            node = node.parentElement;
          }

          return { fg, bg };
        });

      const fg = parseRgb(ratio.fg);
      const bg = parseRgb(ratio.bg);
      expect(fg).toBeTruthy();
      expect(bg).toBeTruthy();
      if (!fg || !bg) continue;

      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('keyboard navigation should tab through all major section links', async ({ page }) => {
    const visitedHashes = new Set();
    const expected = ['#about', '#resume', '#projects', '#contact'];

    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return el.getAttribute && el.getAttribute('href');
      });

      if (href && href.startsWith('#')) {
        visitedHashes.add(href);
      }
    }

    for (const hash of expected) {
      expect(visitedHashes.has(hash)).toBe(true);
    }
  });

  test('interactive elements should expose accessible names via aria-label or text', async ({
    page,
  }) => {
    const audit = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('a, button, input, textarea, select')
      );
      const failures = [];

      for (const el of candidates) {
        const hidden = el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true';
        if (hidden) continue;

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (tag === 'input' && ['hidden', 'submit', 'reset', 'button'].includes(type)) continue;

        const ariaLabel = (el.getAttribute('aria-label') || '').trim();
        const text = (el.textContent || '').trim();
        const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();

        if (!ariaLabel && !text && !labelledBy) {
          failures.push(el.outerHTML.slice(0, 120));
        }
      }

      return failures;
    });

    expect(audit).toEqual([]);
  });

  test('heading hierarchy should start with h1 then proceed without skipping h2', async ({
    page,
  }) => {
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => Number(h.tagName[1]));
    });

    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toBe(1);
    expect(headings.filter((n) => n === 1).length).toBe(1);

    let seenH2 = false;
    for (const level of headings) {
      if (level === 2) seenH2 = true;
      if (level === 3) {
        expect(seenH2).toBe(true);
      }
    }
  });

  test('images should have non-empty alt text unless explicitly decorative', async ({ page }) => {
    const failures = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const bad = [];

      for (const img of images) {
        const decorative =
          img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true';
        if (decorative) continue;

        const alt = img.getAttribute('alt');
        if (alt === null || alt.trim().length === 0) {
          bad.push(img.outerHTML.slice(0, 120));
        }
      }

      return bad;
    });

    expect(failures).toEqual([]);
  });
});
