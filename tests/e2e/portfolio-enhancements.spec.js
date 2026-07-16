const { test, expect } = require('@playwright/test');

async function openReady(page, path = '/ko/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true');
}

test.describe('Portfolio capability enhancements', () => {
  test('capability UI replaces obsolete recruiter and role-routing DOM', async ({ page }) => {
    for (const path of ['/ko/', '/en/', '/ja/']) {
      await openReady(page, path);
      await expect(page.locator('.capability-evidence')).toHaveCount(1);
      await expect(page.locator('[data-capability-control]')).toHaveCount(5);
      await expect(
        page.locator(
          '[class*="recruiter"], .role-chip, [data-role-filter], [data-role-status], [data-role]'
        )
      ).toHaveCount(0);
      await expect(page.locator('.project-evidence-matrix, .role-quick-paths')).toHaveCount(0);
    }
  });

  test('reinitializing the bootstrap keeps controls and handlers single-bound', async ({
    page,
  }) => {
    await openReady(page);
    const historyLength = await page.evaluate(() => window.history.length);

    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = `/main.js?capability-reinit=${Date.now()}`;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        })
    );

    await expect(page.locator('.capability-evidence')).toHaveCount(1);
    await expect(page.locator('[data-capability-control]')).toHaveCount(5);
    await expect(page.locator('[data-projects-expand]')).toHaveCount(1);
    await expect(page.locator('.mobile-actions')).toHaveCount(1);

    await page.locator('[data-capability-control="backend-api"]').click();
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength + 1);
    await expect(page.locator('[data-capability-status]')).toContainText('3');
  });

  test('generic project text never decides capability membership', async ({ page }) => {
    await openReady(page, '/en/');
    const unrelated = page.locator('#project-hycu-fsds-autonomous-driving');
    await unrelated.evaluate((card) => card.append(' SafetyWallet Product UI Backend API'));

    await page.locator('[data-capability-control="product-ui"]').click();
    await expect(unrelated).toHaveAttribute('data-capability-match', 'false');
    await expect(unrelated).toHaveClass(/is-capability-muted/);
    await expect(unrelated).not.toHaveAttribute('aria-hidden', 'true');
  });

  test('project disclosure exposes deterministic expanded state', async ({ page }) => {
    await openReady(page);
    const button = page.locator('[data-projects-expand]');
    const list = page.locator('#project-list');

    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toHaveAttribute('data-projects-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toHaveAttribute('data-projects-expanded', 'true');
    await expect(page.locator('#project-tmux-productivity-suite')).toBeVisible();
  });
});
