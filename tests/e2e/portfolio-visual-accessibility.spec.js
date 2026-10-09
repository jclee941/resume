const { test, expect } = require('@playwright/test');

test.describe('Portfolio visual accessibility', () => {
  test('timeline expand buttons control real detail regions', async ({ page }) => {
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });

    const olderRoles = page.locator('button.timeline-more-btn');
    const olderNodes = page.locator('.timeline-node--older');
    await expect(olderRoles).toHaveAttribute('aria-expanded', 'false');
    expect(await olderNodes.count()).toBeGreaterThan(0);
    await expect(olderRoles).toContainText(String(await olderNodes.count()));
    await expect(olderNodes.first()).toBeHidden();
    await olderRoles.click();
    await expect(olderRoles).toHaveAttribute('aria-expanded', 'true');
    await expect(olderNodes.first()).toBeVisible();

    const buttons = page.locator('button.timeline-expand-btn');
    await expect(buttons.first()).toBeVisible();
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const controls = await button.getAttribute('aria-controls');
      expect(controls, `timeline button ${i} aria-controls`).toBeTruthy();

      const visibleText = (await button.innerText()).trim();
      const label = await button.getAttribute('aria-label');
      expect(label, `timeline button ${i} accessible name`).toContain(visibleText);

      const details = page.locator(`#${controls}`);
      await expect(details, `controlled details for button ${i}`).toHaveCount(1);
      await expect(details).toHaveAttribute('aria-hidden', 'true');

      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(details).toHaveAttribute('aria-hidden', 'false');
    }
  });

  test('mobile skill tags stay readable and inside their cards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('#skill-radar-grid .skill-domain-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const report = await cards.evaluateAll((elements) =>
      elements.flatMap((card) => {
        const cardRect = card.getBoundingClientRect();
        return [...card.querySelectorAll('.skill-item')].map((item) => {
          const rect = item.getBoundingClientRect();
          return {
            fontSize: Number.parseFloat(getComputedStyle(item).fontSize),
            inside: rect.left >= cardRect.left - 0.5 && rect.right <= cardRect.right + 0.5,
          };
        });
      })
    );

    expect(report.length).toBeGreaterThan(0);
    for (const item of report) {
      expect(item.fontSize).toBeGreaterThanOrEqual(12);
      expect(item.inside).toBe(true);
    }
  });

  for (const locale of ['ko', 'en', 'ja']) {
    test(`${locale} about content fits a 320px viewport without clipping`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });
      const dimensions = await page.locator('.about-grid').evaluate((grid) => ({
        viewport: window.innerWidth,
        body: document.body.scrollWidth,
        panels: [...grid.children].map((panel) => panel.getBoundingClientRect().right),
      }));

      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
      for (const right of dimensions.panels) {
        expect(right).toBeLessThanOrEqual(dimensions.viewport);
      }
    });

    test(`${locale} skill cards use the shared surface radius`, async ({ page }) => {
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });

      const card = page.locator('#skill-radar-grid .skill-domain-card').first();
      await expect(card).toBeVisible({ timeout: 15000 });
      const styles = await card.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          radius: computed.borderTopLeftRadius,
          token: computed.getPropertyValue('--radius-lg').trim(),
        };
      });

      expect(styles.radius).toBe(styles.token);
    });
  }
});
