// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const recruiterEnhancementSource = path.join(
  __dirname,
  '../../apps/portfolio/src/scripts/modules/recruiter-enhancements.js'
);

test.describe('Portfolio recruiter enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('role quick paths focus matching evidence without removing project cards', async ({
    page,
  }) => {
    const projectCards = page.locator('#projects li.project-item');
    const initialProjectCount = await projectCards.count();

    await page.getByRole('button', { name: /Security Ops/ }).click();

    await expect(page.getByRole('button', { name: /Security Ops/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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

  test('project evidence matrix preserves project list and project more behavior', async ({
    page,
  }) => {
    const matrix = page.locator('.project-evidence-matrix');
    await expect(matrix).toBeVisible();
    await expect(page.getByRole('heading', { name: '직무별 검토 경로' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '프로젝트 근거 매트릭스' })).toBeVisible();
    await expect(matrix.locator('.project-evidence-card')).toHaveCount(4);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/역할|Role/);
    await expect(matrix.locator('.project-evidence-card').first()).toContainText(/근거|Evidence/);

    const projectCards = page.locator('#projects li.project-item');
    await expect(projectCards).toHaveCount(11);

    const moreButton = page.locator('.project-more-btn');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.locator('#project-list')).toHaveClass(/is-expanded/);
    await expect(projectCards.nth(10)).toBeVisible();
  });

  test('project evidence links highlight the target project', async ({ page }) => {
    const reviewerLink = page
      .locator('[data-evidence-project="jclee-bot GitHub App"]')
      .getByText(/근거 보기|Open proof/);
    await reviewerLink.click();

    const reviewerCard = page.locator('#projects li.project-item', {
      hasText: 'jclee-bot GitHub App',
    });
    await expect(reviewerCard).toBeVisible();
    await expect(reviewerCard).toHaveClass(/is-role-match/);
  });

  test('HTML template escaping remains safe for quoted attributes', async () => {
    const source = fs.readFileSync(recruiterEnhancementSource, 'utf8');
    for (const entity of ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;']) {
      expect(source).toContain(entity);
    }
  });

  test('mobile primary CTA keeps readable text on accent background', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const primaryAction = page.getByRole('link', { name: /채용 문의|Contact about role/ });
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

test.describe('Mobile recruiter actions', () => {
  test('mobile hero CTA appears and focuses before recruiter review paths', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const contactAction = page.locator('.hero-cta').getByRole('link', { name: '채용 문의' });
    const pdfAction = page.locator('.hero-cta').getByRole('link', { name: '이력서 PDF' });
    await expect(contactAction).toBeVisible();
    await expect(pdfAction).toBeVisible();

    const layout = await page.evaluate(() => {
      const contactElement = document.querySelector('.hero-cta a[href^="mailto:"]');
      const pdfElement = document.querySelector('.hero-cta a[href="/resume.pdf"]');
      const contactRect = contactElement?.getBoundingClientRect();
      const pdfRect = pdfElement?.getBoundingClientRect();
      return {
        contact: contactRect
          ? { y: Math.round(contactRect.y), height: Math.round(contactRect.height) }
          : null,
        pdf: pdfRect ? { y: Math.round(pdfRect.y), height: Math.round(pdfRect.height) } : null,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    expect(layout.contact?.y).toBeLessThan(844);
    expect(layout.pdf?.y).toBeLessThan(844);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);

    await page.evaluate(() => document.body.focus());
    const firstTabStops = [];
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press('Tab');
      firstTabStops.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          if (!active) return null;
          const text = (active.textContent || active.getAttribute('aria-label') || '')
            .replace(/\s+/g, ' ')
            .trim();
          return {
            text,
            isHeroCta: Boolean(active.closest('.hero-cta')),
            isReviewOrRole: Boolean(active.closest('.hero-review-path, .role-quick-paths')),
          };
        })
      );
    }

    const contactIndex = firstTabStops.findIndex(
      (stop) => stop?.isHeroCta && stop.text === '채용 문의'
    );
    const pdfIndex = firstTabStops.findIndex((stop) => stop?.isHeroCta && stop.text === '이력서 PDF');
    const reviewOrRoleIndex = firstTabStops.findIndex((stop) => stop?.isReviewOrRole);

    expect(contactIndex).toBeGreaterThanOrEqual(0);
    expect(pdfIndex).toBeGreaterThanOrEqual(0);
    expect(reviewOrRoleIndex).toBeGreaterThanOrEqual(0);
    expect(contactIndex).toBeLessThan(reviewOrRoleIndex);
    expect(pdfIndex).toBeLessThan(reviewOrRoleIndex);
  });

  test('mobile recruiter action bar keeps core actions reachable without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const actionBar = page.locator('.recruiter-action-bar');
    await expect(actionBar).toBeHidden();

    await page.evaluate(() => {
      const hero = document.querySelector('#hero');
      const heroBottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 480;
      window.scrollTo(0, heroBottom + 24);
    });
    await page.waitForFunction(() =>
      document.querySelector('.recruiter-action-bar')?.classList.contains('is-visible')
    );

    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /문의|Contact/ })).toHaveAttribute(
      'href',
      /mailto:/
    );
    await expect(actionBar.getByRole('link', { name: /프로젝트|Projects/ })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(actionBar.getByRole('link', { name: /PDF/ })).toHaveAttribute(
      'href',
      '/resume.pdf'
    );

    await actionBar.getByRole('button', { name: /닫기|Dismiss/ }).click();
    await expect(actionBar).toBeHidden();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
