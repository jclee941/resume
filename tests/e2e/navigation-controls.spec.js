const { test, expect } = require('@playwright/test');

const LOCALES = [
  { path: '/', label: 'ko' },
  { path: '/en/', label: 'en' },
  { path: '/ja/', label: 'ja' },
];

async function ready(page, path, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.back-to-top', { state: 'attached' });
  await page.waitForSelector('.timeline-node', { state: 'attached' });
}

const frames = (page, count = 2) =>
  page.evaluate(
    (n) =>
      new Promise((resolve) => {
        const step = (left) =>
          left === 0 ? resolve(undefined) : requestAnimationFrame(() => step(left - 1));
        step(n);
      }),
    count
  );

async function openFirstDialog(page) {
  const more = page.locator('.project-more-btn');
  if (await more.isVisible()) await more.click();
  const launcher = page.locator('.project-card[data-project-id] .project-card__launcher').first();
  await launcher.scrollIntoViewIfNeeded();
  await launcher.click();
  await page.waitForSelector('.deep-dive-overlay.active');
  return launcher;
}

test.describe('Header and skip navigation', () => {
  for (const { path, label } of LOCALES) {
    test(`skip link moves focus to the main content (${label})`, async ({ page }) => {
      await ready(page, path, { width: 1440, height: 900 });
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      expect(new URL(page.url()).hash).toBe('#main-content');
      await page.keyboard.press('Tab');
      const insideMain = await page.evaluate(() =>
        document.getElementById('main-content').contains(document.activeElement)
      );
      expect(insideMain, 'next Tab continues inside the main content').toBe(true);
    });

    for (const width of [390, 1440]) {
      test(`header focus order equals visual order at ${width}px (${label})`, async ({ page }) => {
        await ready(page, path, { width, height: 800 });
        await expect(page.locator('.lang-switcher:visible')).toHaveCount(1);
        await page.keyboard.press('Tab');
        const sequence = [];
        for (let i = 0; i < 12; i += 1) {
          await page.keyboard.press('Tab');
          const item = await page.evaluate(() => {
            const active = document.activeElement;
            const rect = active.getBoundingClientRect();
            return {
              inHeader: !!active.closest('.site-header'),
              row: Math.round(rect.top / 12),
              x: Math.round(rect.left),
            };
          });
          if (!item.inHeader) break;
          sequence.push(item);
        }
        expect(sequence.length).toBeGreaterThanOrEqual(width === 390 ? 5 : 7);
        const visual = [...sequence].sort((a, b) => a.row - b.row || a.x - b.x);
        expect(sequence).toEqual(visual);
      });
    }
  }

  test('choosing a mobile menu link closes the menu and focuses its destination', async ({
    page,
  }) => {
    await ready(page, '/', { width: 390, height: 844 });
    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    const link = page.locator('.nav-links a').nth(1);
    const id = (await link.getAttribute('href')).slice(1);
    await link.click();
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#${id}`)).toBeFocused();
  });
});

test.describe('Reduced motion scrolling', () => {
  test('anchor navigation jumps instead of animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page, '/', { width: 1440, height: 900 });
    await page.evaluate(() => {
      window.__positions = new Set();
      const sample = () => {
        window.__positions.add(Math.round(window.scrollY));
        requestAnimationFrame(sample);
      };
      sample();
    });
    await page.locator('.nav-links a:visible').nth(3).click();
    await expect(page.locator('#about')).toBeFocused();
    await frames(page, 6);
    const positions = await page.evaluate(() => [...window.__positions]);
    expect(positions.length, `scroll positions: ${positions.join(',')}`).toBeLessThanOrEqual(2);
  });
});

test.describe('Icon-only control tooltips', () => {
  test('nav toggle shows its localized label on hover and keyboard focus, keeping its name', async ({
    page,
  }) => {
    await ready(page, '/en/', { width: 320, height: 700 });
    const toggle = page.locator('.nav-toggle');
    const read = () =>
      toggle.evaluate((node) => {
        const style = getComputedStyle(node, '::after');
        return { opacity: style.opacity, content: style.content };
      });
    expect((await read()).opacity).toBe('0');

    await toggle.hover();
    await expect.poll(async () => (await read()).opacity).toBe('1');
    expect((await read()).content).toBe('"Open navigation"');
    await expect(toggle).toHaveAttribute('aria-label', 'Open navigation');

    await page.mouse.move(2, 2);
    await page.keyboard.press('Tab');
    await toggle.focus();
    await expect.poll(async () => (await read()).opacity).toBe('1');
  });

  test('tooltip stays inside the viewport at 320px', async ({ page }) => {
    await ready(page, '/ja/', { width: 320, height: 700 });
    await page.locator('.nav-toggle').hover();
    const box = await page.locator('.nav-toggle').evaluate((node) => {
      const style = getComputedStyle(node, '::after');
      const host = node.getBoundingClientRect();
      const right = host.right - parseFloat(style.right);
      const left = right - parseFloat(style.width);
      return { left, right, width: innerWidth };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.width);
  });
});

test.describe('Control spacing and edges', () => {
  test('language links and the action bar keep 8px between neighbours at 320px', async ({
    page,
  }) => {
    await ready(page, '/', { width: 320, height: 700 });
    const langGaps = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('.lang-link')]
        .filter((link) => link.offsetParent !== null)
        .map((link) => link.getBoundingClientRect());
      return rects.slice(1).map((rect, i) => rect.left - rects[i].right);
    });
    expect(langGaps.length).toBe(2);
    langGaps.forEach((gap) => expect(gap).toBeGreaterThanOrEqual(8));

    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForSelector('.recruiter-action-bar.is-visible');
    const barGaps = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('.recruiter-action-bar > *')].map((node) =>
        node.getBoundingClientRect()
      );
      const gaps = [];
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const dx = Math.max(rects[i].left - rects[j].right, rects[j].left - rects[i].right);
          const dy = Math.max(rects[i].top - rects[j].bottom, rects[j].top - rects[i].bottom);
          if (Math.max(dx, dy) < 8 && !(dx > 0 || dy > 0) === false) gaps.push(Math.max(dx, dy));
        }
      }
      return { gaps, widths: rects.map((rect) => Math.min(rect.width, rect.height)) };
    });
    expect(barGaps.gaps).toEqual([]);
    barGaps.widths.forEach((size) => expect(size).toBeGreaterThanOrEqual(44));
  });

  test('pressed state paints immediately on the ghost hero button', async ({ page }) => {
    await ready(page, '/en/', { width: 1440, height: 900 });
    const ghost = page.locator('#hero .hero-cta a').nth(1);
    const box = await ghost.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await frames(page, 1);
    const pressed = await ghost.evaluate((node) => getComputedStyle(node).backgroundImage);
    await page.mouse.move(2, 2);
    await page.mouse.up();
    expect(pressed).not.toBe('none');
  });
});

test.describe('Back-to-top and the cover letter', () => {
  test('is hidden while it would cover cover-letter text on a phone', async ({ page }) => {
    await ready(page, '/', { width: 390, height: 844 });
    const fold = page.locator('.cover-letter__toggle');
    if (await fold.isVisible()) await fold.click();
    await page
      .locator('.cover-letter__paragraphs li')
      .nth(1)
      .evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await frames(page, 3);
    await expect(page.locator('.back-to-top')).not.toHaveClass(/visible/);
    await expect(page.locator('.back-to-top')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('Deep-dive dialog', () => {
  test('focuses the close button once and returns focus to the launcher exactly once', async ({
    page,
  }) => {
    await ready(page, '/', { width: 1440, height: 900 });
    await page.evaluate(() => {
      window.__focus = [];
      document.addEventListener(
        'focusin',
        (event) =>
          window.__focus.push({
            cls: String(event.target.className).split(' ')[0],
            outgoing: !document.querySelector('.deep-dive-overlay').classList.contains('active'),
            inDialog: !!event.target.closest('.deep-dive-overlay'),
          }),
        true
      );
    });
    const launcher = await openFirstDialog(page);
    await expect(page.locator('.deep-dive-close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(launcher).toBeFocused();
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const overlay = document.querySelector('.deep-dive-overlay');
          overlay.addEventListener('transitionend', () => resolve(undefined), { once: true });
          setTimeout(resolve, 1000);
        })
    );
    const events = await page.evaluate(() => window.__focus);
    const closeIndex = events.findIndex((e) => e.cls === 'deep-dive-close');
    expect(events.filter((e) => e.cls === 'deep-dive-close')).toHaveLength(1);
    expect(events.slice(closeIndex).filter((e) => e.cls === 'project-card__launcher')).toHaveLength(
      1
    );
    expect(events.filter((e) => e.outgoing && e.inDialog)).toEqual([]);
  });

  test('rapid close during entry never refocuses the outgoing dialog', async ({ page }) => {
    await ready(page, '/', { width: 1440, height: 900 });
    await page.evaluate(() => {
      window.__late = 0;
      document.addEventListener(
        'focusin',
        (event) => {
          const overlay = document.querySelector('.deep-dive-overlay');
          if (overlay && overlay.contains(event.target) && !overlay.classList.contains('active')) {
            window.__late += 1;
          }
        },
        true
      );
    });
    await openFirstDialog(page);
    await page.keyboard.press('Escape');
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const overlay = document.querySelector('.deep-dive-overlay');
          overlay.addEventListener('transitionend', () => resolve(undefined), { once: true });
          setTimeout(resolve, 1000);
        })
    );
    await frames(page, 30);
    expect(await page.evaluate(() => window.__late)).toBe(0);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`close control stays visible at the end of a long dialog (${viewport.width}px)`, async ({
      page,
    }) => {
      await ready(page, '/', viewport);
      await openFirstDialog(page);
      await page.evaluate(() => {
        const overlay = document.querySelector('.deep-dive-overlay');
        overlay.scrollTop = overlay.scrollHeight;
      });
      await frames(page, 2);
      const result = await page.evaluate(() => {
        const rect = document.querySelector('.deep-dive-close').getBoundingClientRect();
        const overlay = document.querySelector('.deep-dive-overlay');
        return {
          scrolled: overlay.scrollTop > 0,
          top: rect.top,
          bottom: rect.bottom,
          size: Math.min(rect.width, rect.height),
          height: innerHeight,
        };
      });
      expect(result.scrolled).toBe(true);
      expect(result.top).toBeGreaterThanOrEqual(0);
      expect(result.bottom).toBeLessThanOrEqual(result.height);
      expect(result.size).toBeGreaterThanOrEqual(44);
    });
  }

  test('every word in the period gets its own span in the label face', async ({ page }) => {
    await ready(page, '/', { width: 1440, height: 900 });
    await openFirstDialog(page);
    const parts = await page.evaluate(() => {
      const period = document.querySelector('.deep-dive-header__period');
      const words = [...period.querySelectorAll('.deep-dive-header__period-word')];
      return {
        letters: (period.textContent.match(/\p{L}+/gu) || []).join(''),
        spans: words.map((word) => word.textContent).join(''),
        faces: words.map((word) => getComputedStyle(word).fontFamily),
        periodFace: getComputedStyle(period).fontFamily,
      };
    });
    expect(parts.spans).toBe(parts.letters);
    parts.faces.forEach((face) => expect(face).not.toBe(parts.periodFace));
  });
});
