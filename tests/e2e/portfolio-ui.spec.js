const { test, expect } = require('@playwright/test');

test.describe('Portfolio UI', () => {
  test('should load Korean homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Jaecheol Lee|이재철/);
  });

  test('should load English homepage', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Jaecheol Lee/);
  });

  test('should have terminal input', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#terminal-input')).toBeVisible();
  });

  test('should execute help command', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cliInput = page.locator('#terminal-input');
    await cliInput.fill('help');
    await cliInput.press('Enter');
    await page.waitForTimeout(500);
    await expect(page.locator('#cli-output')).toContainText('Available commands');
  });

  test('observability widget shows live stats and a status line', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded'
});
    // Bring the section into view so its IntersectionObserver-driven polling starts.
    await page.locator('#observability').scrollIntoViewIfNeeded();

    // At least one stat card should move off the '--' placeholder with live data.
    const uptime = page.locator('.observability-stat:has(.stat-label:text-is("Uptime")) .stat-value');
    await expect(uptime).not.toHaveText('--', { timeout: 15000 });

    // The aria-live status line becomes visible and announces freshness.
    const status = page.locator('[data-observability-status]');
    await expect(status).toBeVisible();
    const statusText = page.locator('[data-observability-status-text]');
    await expect(statusText).toHaveAttribute('aria-live', 'polite');
    await expect(statusText).not.toHaveText('');
  });
});
