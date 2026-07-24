const { expect } = require('@playwright/test');

async function openReady(page, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.back-to-top')).toHaveAttribute('aria-hidden', 'true');
}

async function dynamicStateDescriptors(page, routeInfo, viewport) {
  await openReady(page, routeInfo.route, viewport);
  return page.evaluate(() => ({ capabilities: [...document.querySelectorAll('[data-capability-control]')].map((item) => item.dataset.capabilityControl), timelines: document.querySelectorAll('.timeline-node .timeline-expand-btn').length, domains: [...document.querySelectorAll('.skill-domain-card[data-domain]')].map((item) => item.dataset.domain) }));
}

module.exports = { dynamicStateDescriptors, openReady };
