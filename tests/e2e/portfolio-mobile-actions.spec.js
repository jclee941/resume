const { test, expect } = require('@playwright/test');

test.describe('Mobile portfolio actions', () => {
  const mobileHeroLocales = [
    { path: '/', label: 'ko' },
    { path: '/en/', label: 'en' },
    { path: '/ja/', label: 'ja' },
  ];

  for (const { path, label } of mobileHeroLocales) {
    test(`mobile hero CTA links stay fully visible in the first viewport (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      const layout = await page.evaluate(() => {
        const heroContentRect = document
          .querySelector('#hero .hero-content')
          ?.getBoundingClientRect();
        const availabilityRect = document
          .querySelector('#hero .hero-availability')
          ?.getBoundingClientRect();
        const links = [...document.querySelectorAll('.hero-cta a')].map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: element.textContent?.replace(/\s+/g, ' ').trim(),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
          };
        });
        return {
          links,
          viewportHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          heroContent: heroContentRect
            ? { left: heroContentRect.left, right: heroContentRect.right }
            : null,
          availability: availabilityRect
            ? { left: availabilityRect.left, right: availabilityRect.right }
            : null,
        };
      });

      expect(layout.links).toHaveLength(2);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
      expect(layout.availability.left).toBeGreaterThanOrEqual(layout.heroContent.left);
      expect(layout.availability.right).toBeLessThanOrEqual(layout.heroContent.right);
      for (const link of layout.links) {
        expect(link.height, `${label} CTA target height: ${link.text}`).toBeGreaterThanOrEqual(44);
        expect(link.top, `${label} CTA fully visible: ${link.text}`).toBeGreaterThanOrEqual(0);
        expect(link.bottom, `${label} CTA fully visible: ${link.text}`).toBeLessThanOrEqual(
          layout.viewportHeight
        );
      }

      if (label === 'ja') {
        const japaneseLabel = await page
          .locator('.hero-cta a')
          .first()
          .evaluate((element) => {
            const node = element.firstChild;
            const characters = [...node.data];
            const rendered = characters
              .map((character, index) => {
                if (character === '\u2060') return null;
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + 1);
                return { character, top: Math.round(range.getBoundingClientRect().top) };
              })
              .filter(Boolean);
            return {
              normalized: characters.filter((character) => character !== '\u2060').join(''),
              wordJoiners: characters.filter((character) => character === '\u2060').length,
              finalTop: rendered.at(-1).top,
              previousTop: rendered.at(-2).top,
            };
          });

        expect(japaneseLabel.normalized).toBe('注目プロジェクトを見る');
        expect(japaneseLabel.wordJoiners).toBeGreaterThan(0);
        expect(japaneseLabel.finalTop).toBe(japaneseLabel.previousTop);
      }
    });
  }

  test('mobile hero CTA appears and focuses before featured project proofs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const projectAction = page
      .locator('.hero-cta')
      .getByRole('link', { name: '대표 프로젝트 보기' });
    const pdfAction = page.locator('.hero-cta').getByRole('link', { name: '이력서 PDF' });
    await expect(projectAction).toBeVisible();
    await expect(pdfAction).toBeVisible();

    const layout = await page.evaluate(() => {
      const projectElement = document.querySelector('.hero-cta a[href="#projects"]');
      const pdfElement = document.querySelector('.hero-cta a[href="/resume.pdf"]');
      const projectRect = projectElement?.getBoundingClientRect();
      const pdfRect = pdfElement?.getBoundingClientRect();
      return {
        project: projectRect
          ? { y: Math.round(projectRect.y), height: Math.round(projectRect.height) }
          : null,
        pdf: pdfRect ? { y: Math.round(pdfRect.y), height: Math.round(pdfRect.height) } : null,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    expect(layout.project?.y).toBeLessThan(844);
    expect(layout.pdf?.y).toBeLessThan(844);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);

    await page.evaluate(() => document.body.focus());
    const firstTabStops = [];
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press('Tab');
      firstTabStops.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          if (!active) return null;
          const text = (active.textContent || active.getAttribute('aria-label') || '')
            .replace(/\s+/g, ' ')
            .trim();
          return {
            text,
            isHeroCta: Boolean(active.closest('.hero-cta')),
            isProjectProof: Boolean(active.closest('.hero-public-proof__links')),
          };
        })
      );
    }

    const projectIndex = firstTabStops.findIndex(
      (stop) => stop?.isHeroCta && stop.text === '대표 프로젝트 보기'
    );
    const pdfIndex = firstTabStops.findIndex(
      (stop) => stop?.isHeroCta && stop.text === '이력서 PDF'
    );
    const proofIndex = firstTabStops.findIndex((stop) => stop?.isProjectProof);

    expect(projectIndex).toBeGreaterThanOrEqual(0);
    expect(pdfIndex).toBeGreaterThanOrEqual(0);
    expect(proofIndex).toBeGreaterThanOrEqual(0);
    expect(projectIndex).toBeLessThan(proofIndex);
    expect(pdfIndex).toBeLessThan(proofIndex);
  });

  for (const path of ['/ko/', '/en/', '/ja/']) {
    test(`mobile action set is exactly Projects, Resume PDF, Contact (${path})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const actionBar = page.locator('.mobile-actions');
      await expect(actionBar).toBeHidden();

      await page.evaluate(() => window.scrollTo(0, 240));
      await page.waitForFunction(() => !document.querySelector('.mobile-actions')?.hidden);
      await expect(actionBar).toBeVisible();
      await expect(actionBar.getByRole('link')).toHaveText(['Projects', 'Resume PDF', 'Contact']);
      await expect(actionBar.getByRole('link')).toHaveCount(3);
      expect(
        await actionBar
          .getByRole('link')
          .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
      ).toEqual(['#projects', '/resume.pdf', '#contact']);
      await expect(actionBar.getByRole('button')).toHaveCount(0);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      ).toBe(false);
    });
  }
});
