const { test, expect } = require('@playwright/test');
const { escapeRegExp } = require('../helpers/owner-data');
const { HERO_CONTENT } = require('./fixtures/owner-copy');

// Role labels come from the hero copy; evidence counts are the number of project cards
// the page tags with the role, so the specs follow whatever content is materialized.
const ROLES = HERO_CONTENT.ko.quickRoles.map(([id, label]) => ({ id, label }));
const SECURITY = ROLES.find((role) => role.id === 'security');
const COUNT_LABELS = {
  ko: (count) => `근거 ${count}건`,
  en: (count) => `${count} evidence ${count === 1 ? 'item' : 'items'}`,
  ja: (count) => `${count}件の根拠`,
};

/** @param {import('@playwright/test').Page} page @param {string} roleId */
function roleProjects(page, roleId) {
  return page.locator(`#projects li.project-item[data-role~="${roleId}"]`);
}

test.describe('Portfolio role evidence routing', () => {
  test('Korean role chips show evidence counts and focus all matching projects', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const { id, label } of ROLES) {
      const roleChip = page.locator(`.role-chip[data-role-filter="${id}"]`);
      await expect(roleChip).toContainText(label);
      await expect(roleChip).toContainText(COUNT_LABELS.ko(await roleProjects(page, id).count()));
    }

    const securityCount = await roleProjects(page, SECURITY.id).count();
    expect(securityCount).toBeGreaterThan(0);
    const securityButton = page.getByRole('button', {
      name: new RegExp(escapeRegExp(SECURITY.label)),
    });
    await securityButton.click();

    await expect(securityButton).toHaveAttribute('aria-pressed', 'true');
    const roleOrientation = page.locator('[data-role-status]');
    await expect(roleOrientation).toHaveAttribute('aria-live', 'polite');
    await expect(roleOrientation).toContainText(SECURITY.label);
    await expect(roleOrientation).toContainText(COUNT_LABELS.ko(securityCount));
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

    // Every project tagged with the role is focused, and nothing else.
    await expect(page.locator('#projects li.project-item.is-role-match')).toHaveCount(
      securityCount
    );
    await expect(
      page.locator(`#projects li.project-item.is-role-match:not([data-role~="${SECURITY.id}"])`)
    ).toHaveCount(0);
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

    await page.getByRole('button', { name: new RegExp(escapeRegExp(SECURITY.label)) }).click();

    await expect(page.locator('[data-role-status]')).toContainText(SECURITY.label);

    const projectScrollCalls = await page.evaluate(
      () => window.__roleScrollTargets.filter((target) => target === 'projects').length
    );
    expect(projectScrollCalls).toBe(1);
  });

  test('role evidence counts localize on English and Japanese pages', async ({ page }) => {
    for (const locale of ['en', 'ja']) {
      await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });
      for (const { id } of ROLES) {
        await expect(page.locator(`.role-chip[data-role-filter="${id}"]`)).toContainText(
          COUNT_LABELS[locale](await roleProjects(page, id).count())
        );
      }
    }
  });
});
