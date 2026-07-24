const YAML = require('yaml');
const { walkAccessible } = require('./public-copy-ledger-extractor-values');

async function extractNonDom(page) {
  return page.evaluate(async () => {
    const rows = [{ kind: 'document-title', selector: 'document:title', attribute: null, accessiblePath: null, value: document.title }];
    [...document.querySelectorAll('meta')].forEach((element, index) => {
      const key = element.getAttribute('name') || element.getAttribute('property');
      const value = element.getAttribute('content');
      if (key && value) rows.push({ kind: 'metadata', selector: `meta:${key}:${index}`, attribute: 'content', accessiblePath: null, value });
    });
    const flatten = (value, pointer, prefix, kind) => {
      if (Array.isArray(value)) return value.forEach((item, index) => flatten(item, `${pointer}/${index}`, prefix, kind));
      if (value && typeof value === 'object') return Object.keys(value).sort().forEach((key) => flatten(value[key], `${pointer}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`, prefix, kind));
      if (typeof value === 'string' && value.trim()) rows.push({ kind, selector: `${prefix}:${pointer || '/'}`, attribute: null, accessiblePath: null, value });
    };
    [...document.querySelectorAll('script[type="application/ld+json"]')].forEach((element, index) => flatten(JSON.parse(element.textContent), '', `jsonld:${index}`, 'jsonld'));
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const route = new URL(manifestLink.href).pathname;
      const manifest = await (await fetch(manifestLink.href)).json();
      flatten(manifest, '', `manifest:${route}`, 'manifest');
    }
    return rows;
  });
}

async function extractAccessible(page, selectors) {
  const output = [];
  for (const selector of selectors) {
    const snapshot = await page.locator(selector).ariaSnapshot();
    for (const item of walkAccessible(YAML.parse(snapshot))) {
      output.push({ kind: 'accessible-tree', selector, attribute: null, accessiblePath: item.path, value: item.value });
    }
  }
  return output;
}

async function installProductionResponseCache(context) {
  const responses = new Map();
  const stats = { live: 0, replayed: 0 };
  await context.route(/^https:\/\/resume\.jclee\.me\//, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const key = route.request().url();
    if (responses.has(key)) {
      stats.replayed += 1;
      return route.fulfill(responses.get(key));
    }
    const response = await route.fetch();
    const headers = response.headers();
    delete headers['content-encoding'];
    delete headers['content-length'];
    const snapshot = { status: response.status(), headers, body: await response.body() };
    if (response.status() < 400) responses.set(key, snapshot);
    stats.live += 1;
    return route.fulfill(snapshot);
  });
  return stats;
}

module.exports = { extractAccessible, extractNonDom, installProductionResponseCache };
