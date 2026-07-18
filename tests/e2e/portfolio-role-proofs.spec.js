const { test, expect } = require('@playwright/test');

const LOCALES = [
  {
    path: '/ko/',
    labels: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
  },
  {
    path: '/en/',
    labels: [
      'Product UI',
      'Backend & API',
      'Data & Workflows',
      'Delivery & Operations',
      'Security & Reliability',
    ],
  },
  {
    path: '/ja/',
    labels: [
      'プロダクトUI',
      'バックエンド・API',
      'データ・ワークフロー',
      'デリバリー・運用',
      'セキュリティ・信頼性',
    ],
  },
];

const MAPPINGS = {
  'product-ui': ['safetywallet-cf-workers-pwa', 'resume-portfolio'],
  'backend-api': ['safetywallet-cf-workers-pwa', 'ip-blacklist-platform', 'jclee-bot-github-app'],
  'data-workflows': [
    'safetywallet-cf-workers-pwa',
    'ip-blacklist-platform',
    'content-automation-pipeline',
  ],
  'delivery-operations': ['resume-portfolio', 'terraform-homelab-iac', 'observability-platform'],
  'security-reliability': [
    'safetywallet-cf-workers-pwa',
    'security-alert-system',
    'firewall-policy-automation',
  ],
};

async function openReady(page, path, width) {
  await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true');
}

test.describe('Portfolio capability evidence routing', () => {
  for (const locale of LOCALES) {
    for (const width of [375, 1280]) {
      test(`${locale.path} exposes exact controls with keyboard parity at ${width}px`, async ({
        page,
      }) => {
        await openReady(page, locale.path, width);
        const controls = page.locator('[data-capability-control]');
        await expect(controls).toHaveCount(5);
        await expect(controls).toHaveText(locale.labels);

        const first = controls.first();
        await first.focus();
        await page.keyboard.press('Enter');
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-capability-status]')).toContainText('2');
        await expect(page.locator('[data-capability-status]')).toContainText('SafetyWallet');
        await expect(page.locator('[data-capability-status]')).toContainText('Resume Portfolio');
        await expect(page.locator('#projects')).toHaveAttribute(
          'data-capability-selected',
          'product-ui'
        );
        await expect(page.locator('#project-safetywallet-cf-workers-pwa')).toBeFocused();
      });
    }
  }

  test('exact project mappings are ID-driven and unrelated cards stay in DOM and AT', async ({
    page,
  }) => {
    await openReady(page, '/en/', 1280);
    const cards = page.locator('#projects li.project-item');
    const originalCount = await cards.count();

    for (const [capabilityId, projectIds] of Object.entries(MAPPINGS)) {
      await page.locator(`[data-capability-control="${capabilityId}"]`).click();
      const matches = await page
        .locator('#projects li.project-item[data-capability-match="true"]')
        .evaluateAll((elements) => elements.map((element) => element.id.replace(/^project-/, '')));
      expect(new Set(matches)).toEqual(new Set(projectIds));
      await expect(cards).toHaveCount(originalCount);
      expect(await cards.evaluateAll((elements) => elements.some((card) => card.ariaHidden))).toBe(
        false
      );
    }
  });

  test('a collapsed first target expands before focus and scroll', async ({ page }) => {
    await openReady(page, '/ko/', 1280);
    await page.evaluate(() => {
      const card = document.querySelector('#project-resume-portfolio');
      const list = document.querySelector('#project-list');
      card.classList.add('project-item--collapsed');
      list.classList.remove('is-expanded');
      list.dataset.projectsExpanded = 'false';
    });

    await page.locator('[data-capability-control="delivery-operations"]').click();
    await expect(page.locator('#project-list')).toHaveAttribute('data-projects-expanded', 'true');
    await expect(page.locator('[data-projects-expand]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#project-resume-portfolio')).toBeVisible();
    await expect(page.locator('#project-resume-portfolio')).toBeFocused();
  });

  test('clear and history restoration do not trap focus', async ({ page }) => {
    await openReady(page, '/ja/', 1280);
    const product = page.locator('[data-capability-control="product-ui"]');
    const delivery = page.locator('[data-capability-control="delivery-operations"]');

    await product.click();
    await delivery.click();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(product).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#projects')).toHaveAttribute(
      'data-capability-selected',
      'product-ui'
    );

    await product.click();
    await expect(product).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#projects')).not.toHaveAttribute('data-capability-selected', /.+/);
    await product.focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-capability-control="backend-api"]')).toBeFocused();
  });
});
