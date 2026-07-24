const { extractDom } = require('./public-copy-ledger-extractor-dom');
const { extractAccessible, extractNonDom, installProductionResponseCache } = require('./public-copy-ledger-extractor-nondom');
const { dynamicStateDescriptors, openReady } = require('./public-copy-ledger-extractor-states');
const { normalizePublicValue, normalizeVolatile, occurrenceAddress } = require('./public-copy-ledger-extractor-values');

async function captureState(page, occurrences, routeInfo, state, viewport, action) {
  await openReady(page, routeInfo.route, viewport);
  if (action) await action(page);
  if (state !== 'mobile-actions-visible') {
    await page.evaluate(() => window.scrollTo(0, 0));
    const { expect } = require('@playwright/test');
    await expect(page.locator('.back-to-top')).toHaveAttribute('aria-hidden', 'true');
  }
  occurrences.push(...(await extractPageOccurrences(page, { ...routeInfo, state, viewport })));
}

async function extractPageOccurrences(page, context) {
  const dom = await extractDom(page);
  const raw = [...dom.rows, ...(await extractAccessible(page, dom.accessibleSelectors)), ...(await extractNonDom(page))];
  const counts = new Map();
  return raw.map((item) => {
    const value = normalizePublicValue(item.value);
    if (!value) return null;
    const base = { ...context, kind: item.kind, selector: item.selector, attribute: item.attribute, accessiblePath: item.accessiblePath };
    const key = JSON.stringify([base.locale, base.route, base.state, base.viewport.key, base.kind, base.selector, base.attribute, base.accessiblePath]);
    const occurrenceIndex = counts.get(key) || 0;
    counts.set(key, occurrenceIndex + 1);
    const normalized = normalizeVolatile({ ...base, occurrenceIndex, value, volatile: item.volatile });
    delete normalized.volatile;
    return normalized;
  }).filter(Boolean);
}

module.exports = { captureState, dynamicStateDescriptors, extractPageOccurrences, installProductionResponseCache, normalizePublicValue, occurrenceAddress };
