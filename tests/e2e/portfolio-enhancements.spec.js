// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Portfolio recruiter enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('role quick paths focus matching evidence without removing project cards', async ({
    page,
  }) => {
    const projectCards = page.locator('#projects li.project-item');
    const initialProjectCount = await projectCards.count();
    const securityOpsChip = page.getByRole('button', {
      name: /보안 자동화|Security Automation/,
    });

    await securityOpsChip.click();

    await expect(securityOpsChip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#projects')).toBeInViewport({ timeout: 2000 });
    await expect(page.locator('#projects li.project-item.is-role-match')).not.toHaveCount(0);
    await expect(
      page.locator('#projects li.project-item[data-role~="security"]').first()
    ).toHaveClass(/is-role-match/);
    const dimmedOpacity = await page
      .locator('#projects li.project-item.is-role-dimmed')
      .first()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    expect(dimmedOpacity).toBeGreaterThanOrEqual(0.75);
    await expect(projectCards).toHaveCount(initialProjectCount);
  });

  test('server-rendered role chips wait for hydration before accepting clicks', async ({
    page,
  }) => {
    let continueMainScript = () => {};
    const mainScriptBlocked = new Promise((resolve) => {
      continueMainScript = () => resolve(undefined);
    });
    await page.route('**/main.js*', async (route) => {
      await mainScriptBlocked;
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const securityChip = page.locator('.role-chip[data-role-filter="security"]');
    await expect(securityChip).toBeDisabled();

    continueMainScript();
    await expect(securityChip).toBeEnabled();
    await securityChip.click();

    await expect(securityChip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#projects li.project-item.is-role-match')).not.toHaveCount(0);
  });

  test('project evidence matrix preserves project list and project more behavior', async ({
    page,
  }) => {
    const matrix = page.locator('.project-evidence-matrix');
    await expect(matrix).toBeVisible();
    await expect(page.getByRole('heading', { name: '역할별 프로젝트 보기' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '프로젝트 한눈에 보기' })).toBeVisible();
    await expect(matrix.locator('.project-evidence-card')).toHaveCount(4);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/역할|Role/);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/근거|Evidence/);

    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(12);

    const moreButton = page.locator('.project-more-btn');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.locator('#project-list')).toHaveClass(/is-expanded/);
    await expect(projectCards.nth(11)).toBeVisible();
  });

  test('default project order starts with security operations evidence', async ({ page }) => {
    const expectedVisibleOrder = [
      'Security Alert System',
      'Observability Platform',
      'Terraform Homelab IaC',
      'Firewall Policy Automation',
      'IP Blacklist Platform',
    ];

    for (const path of ['/', '/en/', '/ja/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      const visibleProjectTitles = await page
        .locator('#projects li.project-item:not(.project-item--collapsed) .project-link-title')
        .evaluateAll((elements) =>
          elements.map((element) => element.textContent?.replace('↗', '').trim())
        );

      expect(visibleProjectTitles).toEqual(expectedVisibleOrder);
    }
  });

  test('project evidence links use contextual accessible labels', async ({ page }) => {
    const locales = [
      {
        path: '/',
        genericLabel: '근거 보기',
        expectedLabels: [
          'Security Alert System 근거 보기',
          'Nextrade Security Infra 근거 보기',
          'Observability Platform 근거 보기',
          'jclee-bot GitHub App 근거 보기',
        ],
      },
      {
        path: '/en/',
        genericLabel: 'Open evidence',
        expectedLabels: [
          'Security Alert System evidence',
          'Nextrade Security Infra evidence',
          'Observability Platform evidence',
          'jclee-bot GitHub App evidence',
        ],
      },
      {
        path: '/ja/',
        genericLabel: '根拠を見る',
        expectedLabels: [
          'Security Alert Systemの根拠を見る',
          'Nextrade Security Infraの根拠を見る',
          'Observability Platformの根拠を見る',
          'jclee-bot GitHub Appの根拠を見る',
        ],
      },
    ];

    for (const locale of locales) {
      await page.goto(locale.path, { waitUntil: 'domcontentloaded' });
      const links = page.locator('.project-evidence-matrix .project-evidence-card__link');
      await expect(links).toHaveCount(locale.expectedLabels.length);

      const labels = await links.allTextContents();
      const ariaLabels = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label'))
      );
      const hrefs = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href'))
      );
      const projectTargets = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-evidence-project'))
      );

      expect(labels).toEqual(locale.expectedLabels);
      expect(labels).not.toContain(locale.genericLabel);
      expect(new Set(labels).size).toBe(labels.length);
      // WCAG 2.5.3 Label in Name: no aria-label override — the unique visible
      // link text IS the accessible name.
      expect(ariaLabels).toEqual(locale.expectedLabels.map(() => null));
      expect(hrefs).toEqual(locale.expectedLabels.map(() => '#projects'));
      expect(projectTargets).toEqual([
        'Security Alert System',
        'Nextrade Security Infra',
        'Observability Platform',
        'jclee-bot GitHub App',
      ]);
      expect(Math.max(...labels.map((label) => label.length))).toBeLessThanOrEqual(40);
    }
  });

});
