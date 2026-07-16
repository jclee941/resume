const { expect } = require('@playwright/test');
const manifest = require('../portfolio-visual-snapshot-manifest.json');

const COMPONENT_DIFF_RATIO = 0.05;
const FULL_PAGE_DIFF_RATIO = 0.1;

async function waitForPortfolioReady(page) {
  const root = page.locator('html');
  const bootstrapState = await page
    .waitForFunction(
      () => {
        const state = document.documentElement.getAttribute('data-portfolio-ready');
        return state === 'true' || state === 'error' ? state : false;
      },
      undefined,
      { timeout: 15000 }
    )
    .then((state) => state.jsonValue());
  expect(bootstrapState, 'portfolio bootstrap state').toBe('true');
  await expect(root).toHaveAttribute('data-portfolio-ready', 'true');
  await expect(page.locator('[data-portfolio-bootstrap-status="error"]')).toHaveCount(0);
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
    const images = Array.from(document.images).filter((image) => !image.complete);
    await Promise.all(images.map((image) => image.decode()));
  });
}

async function openPortfolio(page, locale, viewport, motion = 'reduced') {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
  const response = await page.goto(locale.path, { waitUntil: 'domcontentloaded' });
  expect(response, `${locale.id} returned no document response`).not.toBeNull();
  expect(response.status(), `${locale.id} document status`).toBeGreaterThanOrEqual(200);
  expect(response.status(), `${locale.id} document status`).toBeLessThan(400);
  await waitForPortfolioReady(page);
}

async function revealTarget(page, selector) {
  const target = page.locator(selector).first();
  await expect(target, `missing visual target: ${selector}`).toHaveCount(1);
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await page.waitForFunction((value) => {
    const element = document.querySelector(value);
    return Boolean(
      element && (!element.classList.contains('reveal') || element.classList.contains('revealed'))
    );
  }, selector);
  return target;
}

async function collectGeometryViolations(page) {
  return page.evaluate(() => {
    const violations = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      violations.push(`horizontal-overflow:${root.scrollWidth}>${root.clientWidth}`);
    }

    for (const element of document.querySelectorAll('main *, header *, footer *')) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.left < -1 || rect.right > root.clientWidth + 1) {
        violations.push(`clipped:${element.tagName.toLowerCase()}.${element.className}`);
      }
    }

    for (const element of document.querySelectorAll('a,button,input,summary,[role="button"]')) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0) continue;
      if (rect.width < 44 || rect.height < 44) {
        violations.push(
          `target:${element.tagName.toLowerCase()}#${element.id}.${element.className}:${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
      }
    }
    return violations;
  });
}

async function collectCjkWrappingViolations(page, localeId) {
  return page.evaluate((id) => {
    const selectors = 'h1,h2,h3,.hero-role,.hero-tagline,button,summary,.capability-label';
    const orphanPattern = /^(?:은|는|이|가|을|를|과|와|도|만|에|의|로|으로|에서|まで|から|より)$/u;
    const failures = [];
    for (const element of document.querySelectorAll(selectors)) {
      if (!element.textContent || element.getClientRects().length === 0) continue;
      const text = element.textContent.trim();
      if (!text) continue;
      const style = getComputedStyle(element);
      if (id === 'ko' && style.wordBreak !== 'keep-all') {
        failures.push(`word-break:${element.tagName.toLowerCase()}:${text}`);
      }
      if (id === 'ja' && style.lineBreak !== 'strict') {
        failures.push(`line-break:${element.tagName.toLowerCase()}:${text}`);
      }
      const lines = new Map();
      const node = Array.from(element.childNodes).find(
        (child) => child.nodeType === Node.TEXT_NODE
      );
      if (!node) continue;
      for (let index = 0; index < node.textContent.length; index += 1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();
        const key = Math.round(rect.top);
        lines.set(key, `${lines.get(key) || ''}${node.textContent[index]}`);
      }
      for (const line of lines.values()) {
        if (orphanPattern.test(line.trim())) failures.push(`orphan:${line.trim()}:${text}`);
      }
    }
    return failures;
  }, localeId);
}

module.exports = {
  COMPONENT_DIFF_RATIO,
  FULL_PAGE_DIFF_RATIO,
  collectCjkWrappingViolations,
  collectGeometryViolations,
  manifest,
  openPortfolio,
  revealTarget,
  waitForPortfolioReady,
};
