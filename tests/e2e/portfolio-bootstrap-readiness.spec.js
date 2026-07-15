const { test, expect } = require('@playwright/test');

function isResumeData(url) {
  return new URL(url).pathname.endsWith('/resume-data.json');
}

test.describe('portfolio bootstrap readiness', () => {
  test('ready is absent while data is pending and true after every bootstrap step', async ({
    page,
  }) => {
    let releaseRequest;
    const release = new Promise((resolve) => {
      releaseRequest = resolve;
    });

    await page.route('**/resume-data.json', async (route) => {
      await release;
      await route.continue();
    });

    const dataRequest = page.waitForRequest((request) => isResumeData(request.url()));
    await page.goto('/ko/', { waitUntil: 'domcontentloaded' });
    await dataRequest;
    await expect(page.locator('html')).not.toHaveAttribute('data-portfolio-ready');

    releaseRequest();
    await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true');
    await expect(page.locator('[data-portfolio-bootstrap-status]')).toHaveCount(0);
  });

  for (const locale of [
    {
      id: 'ko',
      path: '/ko/',
      copy: '포트폴리오를 불러오지 못했습니다',
      protectedUnits: ['잠시 후'],
    },
    {
      id: 'en',
      path: '/en/',
      copy: 'The portfolio could not be loaded',
      protectedUnits: [],
    },
    {
      id: 'ja',
      path: '/ja/',
      copy: 'ポートフォリオを読み込めませんでした',
      protectedUnits: ['読み込めませんでした', 'しばらくしてから', '再試行してください'],
    },
  ]) {
    test(`${locale.id} rejected data exposes one accessible structured failure`, async ({
      page,
    }, testInfo) => {
      const bootstrapErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes('[PortfolioBootstrap]')) {
          bootstrapErrors.push(message.text());
        }
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.route('**/resume-data.json', (route) =>
        route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      );

      await page.goto(locale.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'error');
      const status = page.locator('[data-portfolio-bootstrap-status="error"]');
      await expect(status).toBeVisible();
      await expect(status).toHaveAttribute('role', 'status');
      await expect(status).toHaveAttribute('aria-live', 'assertive');
      await expect(status).toContainText(locale.copy);
      const protectedUnits = await status.locator('span').evaluateAll((spans) =>
        spans.map((span) => ({
          text: span.textContent,
          whiteSpace: getComputedStyle(span).whiteSpace,
        }))
      );
      expect(protectedUnits).toEqual(
        locale.protectedUnits.map((text) => ({ text, whiteSpace: 'nowrap' }))
      );
      await status.screenshot({
        path: testInfo.outputPath(`bootstrap-error-${locale.id}-375.png`),
      });
      expect(bootstrapErrors).toHaveLength(1);
      expect(bootstrapErrors[0]).toContain('portfolio_bootstrap_failed');
    });
  }
});
