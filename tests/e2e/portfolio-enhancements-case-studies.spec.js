// @ts-check
const { test, expect } = require('@playwright/test');
const { HERO_CONTENT } = require('./fixtures/owner-copy');

test.describe('Portfolio recruiter enhancements — case studies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
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
    const koreanCardTitle = (
      await page.locator('.case-study-deep-dives .project-card__title').first().innerText()
    ).trim();
    expect(koreanCardTitle.length).toBeGreaterThan(0);

    for (const path of ['/en/', '/ja/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.case-study-deep-dives')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(koreanCardTitle);
    }
  });

  test('deep dives follow the project list instead of a separate evidence shortcut', async ({
    page,
  }) => {
    await expect(page.locator('.project-evidence-card__link, [data-evidence-project]')).toHaveCount(
      0
    );
    await expect(page.locator('.case-study-deep-dives')).toBeVisible();
    const deepDivesAfterList = await page.evaluate(() => {
      const list = document.querySelector('#project-list');
      const deepDives = document.querySelector('.case-study-deep-dives');
      return Boolean(
        list &&
        deepDives &&
        list.compareDocumentPosition(deepDives) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(deepDivesAfterList).toBe(true);
  });

  test('mobile primary CTA keeps readable text on accent background', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const primaryAction = page
      .locator('.hero-cta')
      .getByRole('link', { name: HERO_CONTENT.ko.actions[0] });
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
