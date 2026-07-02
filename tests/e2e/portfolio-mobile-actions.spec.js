const { test, expect } = require('@playwright/test');

test.describe('Mobile recruiter actions', () => {
  test('mobile hero CTA appears and focuses before recruiter review paths', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const contactAction = page.locator('.hero-cta').getByRole('link', { name: '면접 문의' });
    const pdfAction = page.locator('.hero-cta').getByRole('link', { name: '이력서 PDF' });
    await expect(contactAction).toBeVisible();
    await expect(pdfAction).toBeVisible();

    const layout = await page.evaluate(() => {
      const contactElement = document.querySelector('.hero-cta a[href^="mailto:"]');
      const pdfElement = document.querySelector('.hero-cta a[href="/resume.pdf"]');
      const contactRect = contactElement?.getBoundingClientRect();
      const pdfRect = pdfElement?.getBoundingClientRect();
      return {
        contact: contactRect
          ? { y: Math.round(contactRect.y), height: Math.round(contactRect.height) }
          : null,
        pdf: pdfRect ? { y: Math.round(pdfRect.y), height: Math.round(pdfRect.height) } : null,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    expect(layout.contact?.y).toBeLessThan(844);
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
            isReviewOrRole: Boolean(active.closest('.hero-review-path, .role-quick-paths')),
          };
        })
      );
    }

    const contactIndex = firstTabStops.findIndex(
      (stop) => stop?.isHeroCta && stop.text === '면접 문의'
    );
    const pdfIndex = firstTabStops.findIndex(
      (stop) => stop?.isHeroCta && stop.text === '이력서 PDF'
    );
    const reviewOrRoleIndex = firstTabStops.findIndex((stop) => stop?.isReviewOrRole);

    expect(contactIndex).toBeGreaterThanOrEqual(0);
    expect(pdfIndex).toBeGreaterThanOrEqual(0);
    expect(reviewOrRoleIndex).toBeGreaterThanOrEqual(0);
    expect(contactIndex).toBeLessThan(reviewOrRoleIndex);
    expect(pdfIndex).toBeLessThan(reviewOrRoleIndex);
  });

  test('mobile recruiter action bar keeps core actions reachable without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const actionBar = page.locator('.recruiter-action-bar');
    await expect(actionBar).toBeHidden();

    await page.evaluate(() => {
      const hero = document.querySelector('#hero');
      const heroBottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 480;
      window.scrollTo(0, heroBottom + 24);
    });
    await page.waitForFunction(() =>
      document.querySelector('.recruiter-action-bar')?.classList.contains('is-visible')
    );

    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /문의|Contact/ })).toHaveAttribute(
      'href',
      /mailto:/
    );
    await expect(actionBar.getByRole('link', { name: /프로젝트|Projects/ })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(actionBar.getByRole('link', { name: /PDF/ })).toHaveAttribute(
      'href',
      '/resume.pdf'
    );

    await actionBar.getByRole('button', { name: /닫기|Dismiss/ }).click();
    await expect(actionBar).toBeHidden();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
