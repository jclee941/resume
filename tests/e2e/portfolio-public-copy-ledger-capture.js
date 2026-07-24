const { expect } = require('@playwright/test');
const { captureState, dynamicStateDescriptors } = require('./fixtures/public-copy-ledger-extractor');
const { DYNAMIC_STATE_SHAPE, runtimeCopy } = require('./fixtures/public-copy-ledger-serializer');
const DESKTOP = { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 };
const MOBILE = { key: 'mobile-375x812', width: 375, height: 812, dpr: 1 };
async function captureRoute(page, context, routeInfo, occurrences) {
  const copy = runtimeCopy(routeInfo.locale, process.env.PORTFOLIO_LEDGER_MODE);
  await captureState(page, occurrences, routeInfo, 'initial', DESKTOP);
  await captureState(page, occurrences, routeInfo, 'mobile-nav-open', MOBILE, async (current) => {
    const toggle = current.locator('.nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(current.locator('.nav-links')).toHaveClass(/open/);
  });
  await captureState(
    page,
    occurrences,
    routeInfo,
    'projects-expanded',
    DESKTOP,
    async (current) => {
      const button = current.locator('[data-projects-expand]');
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    }
  );
  await captureState(page, occurrences, routeInfo, 'cover-expanded', DESKTOP, async (current) => {
    const details = current.locator('#cover-letter details');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
  });
  const dynamic = await dynamicStateDescriptors(page, routeInfo, DESKTOP);
  expect(dynamic).toEqual(DYNAMIC_STATE_SHAPE);
  for (const id of dynamic.capabilities) {
    await captureState(
      page,
      occurrences,
      routeInfo,
      `capability-${id}`,
      DESKTOP,
      async (current) => {
        const control = current.locator(`[data-capability-control="${id}"]`);
        await control.click();
        await expect(control).toHaveAttribute('aria-pressed', 'true');
        await expect(current.locator('[data-capability-control][aria-pressed="true"]')).toHaveCount(1);
        await expect(current.locator('#projects')).toHaveAttribute('data-capability-selected', id);
        await expect(current.locator('[data-capability-status][role="status"]')).toHaveText(
          copy.capabilities[id]
        );
      }
    );
  }
  await captureState(
    page,
    occurrences,
    routeInfo,
    'capability-product-ui-cleared',
    DESKTOP,
    async (current) => {
      const control = current.locator('[data-capability-control="product-ui"]');
      await control.click();
      await control.click();
      await expect(current.locator('[data-capability-control][aria-pressed="false"]')).toHaveCount(
        5
      );
      await expect(current.locator('#projects')).not.toHaveAttribute('data-capability-selected');
      await expect(current.locator('[data-capability-status][role="status"]')).toHaveText(
        copy.clear
      );
    }
  );
  for (let index = 0; index < dynamic.timelines; index += 1) {
    await captureState(
      page,
      occurrences,
      routeInfo,
      `timeline-${index}-expanded`,
      DESKTOP,
      async (current) => {
        const node = current.locator('.timeline-node').nth(index);
        const button = node.locator('.timeline-expand-btn');
        await button.click();
        await expect(node).toHaveClass(/is-expanded/);
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        const details = node.locator('.timeline-details');
        await expect(details).toHaveAttribute('aria-hidden', 'false');
        await expect(button).toHaveAttribute('aria-controls', await details.getAttribute('id'));
        await expect(button.locator('.expand-text')).toHaveText(copy.collapse);
        const company = (await node.locator('.timeline-company').innerText()).trim();
        await expect(button).toHaveAccessibleName(`${copy.collapse} ${copy.detail} ${company}`);
      }
    );
  }
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  });
  await captureState(
    page,
    occurrences,
    routeInfo,
    'clipboard-success',
    DESKTOP,
    async (current) => {
      const link = current.locator('[data-contact-email]').first();
      await expect(link).toHaveAttribute('data-contact-email', 'qws941@kakao.com');
      await link.click();
      await expect(link).toHaveClass(/is-copied/);
      expect(await current.evaluate(() => navigator.clipboard.readText())).toBe('qws941@kakao.com');
      await expect(current.locator('.contact-copy-status[role="status"]')).toHaveText(
        copy.clipboard
      );
    }
  );
  await captureState(
    page,
    occurrences,
    routeInfo,
    'mobile-actions-visible',
    MOBILE,
    async (current) => {
      await expect(current.locator('.mobile-actions')).toBeHidden();
      await current.evaluate(() => window.scrollTo(0, 160));
      expect(
        await current.locator('#contact').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom <= 0 || rect.top >= window.innerHeight;
        })
      ).toBe(true);
      const actions = current
        .getByRole('complementary', { name: copy.region, exact: true })
        .and(current.locator('.mobile-actions.is-visible:not([hidden])'));
      await expect(actions).toBeVisible();
      await expect(actions.locator('.mobile-actions__link')).toHaveCount(3);
      for (const [label, href] of copy.actions) {
        await expect(actions.getByRole('link', { name: label, exact: true })).toHaveAttribute(
          'href',
          href
        );
      }
    }
  );
  await captureState(
    page,
    occurrences,
    routeInfo,
    'skill-search-cloudflare',
    DESKTOP,
    async (current) => {
      await current.locator('#skill-search-input').fill('Cloudflare');
      await expect(current.locator('#skill-search-count[aria-live="polite"]')).toHaveText(
        copy.search
      );
      await expect
        .poll(() =>
          current.evaluate(() => ({
            cards: [...document.querySelectorAll('.skill-domain-card')].filter(
              (item) => item.style.display !== 'none'
            ).length,
            items: [...document.querySelectorAll('.skill-item')].filter(
              (item) => item.style.display !== 'none'
            ).length,
          }))
        )
        .toEqual({ cards: 2, items: 2 });
      expect(
        await current.evaluate(
          () =>
            [...document.querySelectorAll('.skill-domain-card,.skill-item')].filter(
              (item) => item.style.display !== 'none'
            ).length
        )
      ).toBe(4);
    }
  );
  for (const domain of dynamic.domains) {
    await captureState(
      page,
      occurrences,
      routeInfo,
      `skill-domain-${domain}-expanded`,
      DESKTOP,
      async (current) => {
        const card = current.locator(`.skill-domain-card[data-domain="${domain}"]`);
        await card.click();
        await expect(card).toHaveAttribute('aria-expanded', 'true');
        await expect(current.locator('.skill-domain-card[aria-expanded="true"]')).toHaveCount(1);
        const panel = current.locator(`#${await card.getAttribute('aria-controls')}`);
        await expect(panel).not.toHaveAttribute('hidden');
        await expect(panel).toBeVisible();
        await expect(card.locator('.skill-list')).toBeVisible();
        await expect(card.locator('.skill-evidence-drawer')).toBeVisible();
        await expect(card.locator('.skill-evidence-drawer__title')).toHaveText(copy.drawer);
      }
    );
  }
}
module.exports = { captureRoute };
