const { test, expect } = require('@playwright/test');
const path = require('node:path');
const {
  COMPONENT_DIFF_RATIO,
  FULL_PAGE_DIFF_RATIO,
  manifest,
  openPortfolio,
  revealTarget,
} = require('./fixtures/portfolio-qa');

const compareApprovedSnapshots = process.env.PORTFOLIO_COMPARE_APPROVED_SNAPSHOTS === '1';

function captureName(locale, viewport, motion, id) {
  return `${locale.id}-${viewport.id}-${motion}-${id}.png`;
}

async function capture(page, testInfo, locator, name, fullPage = false) {
  const ratio = fullPage ? FULL_PAGE_DIFF_RATIO : COMPONENT_DIFF_RATIO;
  if (compareApprovedSnapshots) {
    const subject = locator || page;
    await expect(subject).toHaveScreenshot(name, {
      animations: 'disabled',
      fullPage,
      maxDiffPixelRatio: ratio,
    });
    return;
  }

  const captureRoot = process.env.PORTFOLIO_QA_CAPTURE_DIR;
  const capturePath = captureRoot
    ? path.join(captureRoot, name)
    : testInfo.outputPath('visual-captures', name);
  if (locator) {
    await locator.screenshot({ path: capturePath, animations: 'disabled' });
  } else {
    await page.screenshot({ path: capturePath, animations: 'disabled', fullPage });
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
            await capture(page, testInfo, target, name, region.fullPage);
          }

          for (const state of manifest.interactionStates.filter(({ widths }) =>
            widths.includes(viewport.width)
          )) {
            await openPortfolio(page, locale, viewport, motion);
            const target = await driveInteraction(page, state);
            await capture(page, testInfo, target, captureName(locale, viewport, motion, state.id));
          }
        });
      }
    }
  }
});
