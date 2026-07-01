const { test, expect } = require('@playwright/test');

const KOREAN_ROLE_PROOF_COUNTS = [
  ['security', 'Security Ops', '4개 근거'],
  ['sre', 'SRE / Observability', '2개 근거'],
  ['devsecops', 'DevSecOps / IaC', '4개 근거'],
  ['automation', '운영 워크플로', '4개 근거'],
];

const SECURITY_PROJECT_TITLES = [
  'Security Alert System',
  'IP Blacklist Platform',
  'AI GitHub PR Reviewer',
  'Bug Bounty Recon Toolkit',
];

test.describe('Portfolio role proof routing', () => {
  test('Korean role chips show proof counts and focus all matching projects', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const [roleId, label, countLabel] of KOREAN_ROLE_PROOF_COUNTS) {
      const roleChip = page.locator(`.role-chip[data-role-filter="${roleId}"]`);
      await expect(roleChip).toContainText(label);
      await expect(roleChip).toContainText(countLabel);
    }

    await page.getByRole('button', { name: /Security Ops/ }).click();

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

    const projectScrollCalls = await page.evaluate(
      () => window.__roleScrollTargets.filter((target) => target === 'projects').length
    );
    expect(projectScrollCalls).toBe(1);
  });

  test('role proof counts localize on English and Japanese pages', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.role-chip[data-role-filter="security"]')).toContainText('4 proofs');
    await expect(page.locator('.role-chip[data-role-filter="sre"]')).toContainText('2 proofs');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.role-chip[data-role-filter="security"]')).toContainText(
      '3件の根拠'
    );
    await expect(page.locator('.role-chip[data-role-filter="sre"]')).toContainText('2件の根拠');
  });
});
