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
    await expect(page.getByRole('heading', { name: '직무별 판단 경로' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '프로젝트 근거 매트릭스' })).toBeVisible();
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
        expectedAriaLabels: [
          'Security Alert System 프로젝트 근거 보기',
          'Nextrade Security Infra 프로젝트 근거 보기',
          'Observability Platform 프로젝트 근거 보기',
          'jclee-bot GitHub App 프로젝트 근거 보기',
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
        expectedAriaLabels: [
          'Open Security Alert System project evidence',
          'Open Nextrade Security Infra project evidence',
          'Open Observability Platform project evidence',
          'Open jclee-bot GitHub App project evidence',
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
        expectedAriaLabels: [
          'Security Alert Systemプロジェクトの根拠を見る',
          'Nextrade Security Infraプロジェクトの根拠を見る',
          'Observability Platformプロジェクトの根拠を見る',
          'jclee-bot GitHub Appプロジェクトの根拠を見る',
        ],
      },
    ];

    for (const locale of locales) {
      await page.goto(locale.path, { waitUntil: 'domcontentloaded' });
      const links = page.locator('.project-evidence-matrix .project-evidence-card__link');
      await expect(links).toHaveCount(locale.expectedLabels.length);

      const labels = await links.allTextContents();
      const ariaLabels = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label') || '')
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
      expect(ariaLabels).toEqual(locale.expectedAriaLabels);
      expect(new Set(ariaLabels).size).toBe(ariaLabels.length);
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

  test('case-study deep dive section gives public context before cards', async ({ page }) => {
    const section = page.locator('.case-study-deep-dives');
    await expect(section).toHaveAttribute('aria-labelledby', 'case-study-heading');
    await expect(page.locator('#case-study-heading')).toContainText('운영 사례 심층 검토');
    await expect(section.locator('.case-study-deep-dives__description')).toContainText('운영 맥락');
    await expect(section.locator('.project-cards-grid')).toHaveAttribute('role', 'list');
    await expect(section.locator('.project-cards-grid')).toHaveAttribute(
      'aria-label',
      '케이스 스터디'
    );
    await expect(section.locator('.project-card__cta').first()).toContainText('상세 검토');

    await section.locator('.project-card').first().click();
    await expect(page.locator('.deep-dive-overlay')).toHaveClass(/active/);
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            document.querySelector('.deep-dive-overlay.active')?.contains(document.activeElement)
          )
        )
      )
      .toBe(true);
  });

  test('localized pages do not leak Korean deep-dive cards', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.case-study-deep-dives')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('넥스트레이드 매매체결시스템 보안 운영');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.case-study-deep-dives')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('넥스트레이드 매매체결시스템 보안 운영');
  });

  test('project evidence links highlight the target project', async ({ page }) => {
    const reviewerLink = page.getByRole('link', {
      name: 'jclee-bot GitHub App 프로젝트 근거 보기',
    });
    await reviewerLink.click();

    const reviewerCard = page.locator('#projects li.project-item', {
      hasText: 'jclee-bot GitHub App',
    });
    await expect(reviewerCard).toBeVisible();
    await expect(reviewerCard).toHaveClass(/is-role-match/);
  });

  test('mobile primary CTA keeps readable text on accent background', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const primaryAction = page.locator('.hero-cta').getByRole('link', { name: '면접 문의' });
    await expect(primaryAction).toBeVisible();

    const styles = await primaryAction.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        color: computed.color,
        backgroundImage: computed.backgroundImage,
      };
    });

    expect(styles.backgroundImage).toContain('linear-gradient');
    expect(styles.color).toBe('rgb(15, 17, 21)');
  });
});
