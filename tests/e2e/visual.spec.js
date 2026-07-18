const { test, expect } = require('@playwright/test');
const path = require('node:path');
const {
  COMPONENT_DIFF_RATIO,
  FULL_PAGE_DIFF_RATIO,
  manifest,
  openPortfolio,
  revealTarget,
} = require('./fixtures/portfolio-qa');
const {
  assertApprovedFixedControlGlyphs,
  prepareFullPageCapture,
} = require('./fixtures/visual-capture-sanity');

const compareApprovedSnapshots = process.env.PORTFOLIO_COMPARE_APPROVED_SNAPSHOTS === '1';

function captureName(locale, viewport, motion, id) {
  return `${locale.id}-${viewport.id}-${motion}-${id}.png`;
}

async function capture(
  page,
  testInfo,
  locator,
  name,
  fullPage = false,
  includeFixedUi = false,
  motion = 'normal'
) {
  for (const selector of manifest.capturePolicy.fixedUiSelectors) {
    const fixedUi = page.locator(selector);
    await expect(fixedUi).toHaveCount(1);
    await fixedUi.evaluate((element, visible) => {
      if (visible) element.style.removeProperty('visibility');
      else element.style.setProperty('visibility', 'hidden', 'important');
    }, includeFixedUi);
    if (includeFixedUi) await expect(fixedUi).toBeVisible();
    else await expect(fixedUi).toBeHidden();
  }

  const animations = motion === 'reduced' || includeFixedUi ? 'allow' : 'disabled';
  if (fullPage) await prepareFullPageCapture(page, animations);

  const ratio = fullPage ? FULL_PAGE_DIFF_RATIO : COMPONENT_DIFF_RATIO;
  if (compareApprovedSnapshots) {
    const subject = locator || page;
    await expect(subject).toHaveScreenshot(name, {
      animations,
      fullPage,
      maxDiffPixelRatio: ratio,
    });
    if (includeFixedUi) {
      await assertApprovedFixedControlGlyphs(page, testInfo, name, animations);
    }
    return;
  }

  const captureRoot = process.env.PORTFOLIO_QA_CAPTURE_DIR;
  const capturePath = captureRoot
    ? path.join(captureRoot, name)
    : testInfo.outputPath('visual-captures', name);
  if (locator) {
    await locator.screenshot({ path: capturePath, animations });
  } else {
    await page.screenshot({ path: capturePath, animations, fullPage });
  }
}

async function focusWithKeyboard(page, selector) {
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate(
      (value) => document.activeElement?.matches(value),
      selector
    );
    if (matched) return;
  }
  throw new Error(`keyboard focus never reached ${selector}`);
}

async function driveInteraction(page, state) {
  if (state.captureViewport) {
    await revealTarget(page, '#skills');
    const targets = [page.locator(state.target), page.locator(state.companion)];
    await expect(targets[1]).toHaveClass(/visible/);
    const actionLinks = targets[0].locator('.mobile-actions__link');
    await expect(actionLinks).toHaveCount(3);
    for (const actionLink of await actionLinks.all()) {
      await expect(actionLink).toBeVisible();
      await expect(actionLink).toHaveAccessibleName(/\S/);
    }
    await expect(targets[1]).toHaveText(/\S/);
    for (const target of targets) {
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    return null;
  }

  const trigger = await revealTarget(page, state.trigger);
  if (state.id === 'focus-visible') {
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await focusWithKeyboard(page, state.trigger);
  } else {
    await trigger.click();
  }

  const target = await revealTarget(page, state.target);
  if (state.id === 'cover-expanded') await expect(target).toHaveAttribute('open', '');
  if (state.id === 'mobile-nav-open')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  if (state.id === 'capability-selected') {
    await expect(trigger).toHaveAttribute('aria-pressed', 'true');
  }
  if (state.id === 'projects-expanded')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return target;
}

test.describe('deterministic multilingual visual evidence', () => {
  for (const locale of manifest.locales) {
    for (const viewport of manifest.viewports) {
      for (const motion of manifest.motionModes) {
        test(`${locale.id} ${viewport.id} ${motion}`, async ({ page }, testInfo) => {
          await openPortfolio(page, locale, viewport, motion);

          for (const region of manifest.coreRegions) {
            const name = captureName(locale, viewport, motion, region.id);
            const target = region.selector ? await revealTarget(page, region.selector) : null;
            await capture(page, testInfo, target, name, region.fullPage, false, motion);
          }

          for (const state of manifest.interactionStates.filter(({ widths }) =>
            widths.includes(viewport.width)
          )) {
            await openPortfolio(page, locale, viewport, motion);
            const target = await driveInteraction(page, state);
            await capture(
              page,
              testInfo,
              target,
              captureName(locale, viewport, motion, state.id),
              false,
              state.captureViewport === true,
              motion
            );
          }
        });
      }
    }
  }
});
