const { test, expect } = require('@playwright/test');

const KOREAN_ROLE_EVIDENCE_COUNTS = [
  ['security', 'Security Ops', '4개 근거'],
  ['infra', 'Security Infra', '2개 근거'],
  ['observability', 'Ops Visibility', '2개 근거'],
  ['automation', 'Ops Workflow', '5개 근거'],
];

const SECURITY_PROJECT_TITLES = [
  'Security Alert System',
  'IP Blacklist Platform',
  'Firewall Policy Automation',
  'Bug Bounty Recon Toolkit',
];

test.describe('Portfolio role evidence routing', () => {
  test('Korean role chips show evidence counts and focus all matching projects', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const [roleId, label, countLabel] of KOREAN_ROLE_EVIDENCE_COUNTS) {
      const roleChip = page.locator(`.role-chip[data-role-filter="${roleId}"]`);
      await expect(roleChip).toContainText(label);
      await expect(roleChip).toContainText(countLabel);
    }

    await page.getByRole('button', { name: /Security Ops/ }).click();

    await expect(page.getByRole('button', { name: /Security Ops/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const roleOrientation = page.locator('[data-role-status]');
    await expect(roleOrientation).toHaveAttribute('aria-live', 'polite');
    await expect(roleOrientation).toContainText('Security Ops');
    await expect(roleOrientation).toContainText('4개 근거');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          hash: window.location.hash,
          state: window.history.state,
        }))
      )
      .toMatchObject({
        hash: '#projects',
        state: expect.objectContaining({ selectedRole: 'security' }),
      });

    for (const title of SECURITY_PROJECT_TITLES) {
      await expect(
        page.locator('#projects li.project-item.is-role-match').filter({ hasText: title })
      ).toHaveCount(1);
    }
  });

  test('reinitializing recruiter enhancements keeps role handlers single-bound', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      window.__roleScrollTargets = [];
      Element.prototype.scrollIntoView = function scrollIntoViewSpy(options) {
        window.__roleScrollTargets.push(this.id || this.className || this.tagName);
        originalScrollIntoView.call(this, options);
      };
    });

    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `/main.js?second-init=${Date.now()}`;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        })
    );

    await expect(page.locator('.role-quick-paths')).toHaveCount(1);
    await expect(page.locator('.project-evidence-matrix')).toHaveCount(1);

    await page.getByRole('button', { name: /Security Ops/ }).click();

    await expect(page.locator('[data-role-status]')).toContainText('Security Ops');

    const projectScrollCalls = await page.evaluate(
      () => window.__roleScrollTargets.filter((target) => target === 'projects').length
    );
    expect(projectScrollCalls).toBe(1);
  });

  test('role evidence counts localize on English and Japanese pages', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.role-chip[data-role-filter="security"]')).toContainText(
      '4 evidence items'
    );
    await expect(page.locator('.role-chip[data-role-filter="infra"]')).toContainText(
      '2 evidence items'
    );
    await expect(page.locator('.role-chip[data-role-filter="observability"]')).toContainText(
      '2 evidence items'
    );

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.role-chip[data-role-filter="security"]')).toContainText(
      '4件の根拠'
    );
    await expect(page.locator('.role-chip[data-role-filter="infra"]')).toContainText('2件の根拠');
    await expect(page.locator('.role-chip[data-role-filter="observability"]')).toContainText(
      '2件の根拠'
    );
  });
});
