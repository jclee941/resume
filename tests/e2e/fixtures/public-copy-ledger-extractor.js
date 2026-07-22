const YAML = require('yaml');
const { expect } = require('@playwright/test');

function normalizePublicValue(value) {
  return String(value)
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\u00a0', ' ')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter((line, index, lines) => line || (index > 0 && index < lines.length - 1))
    .join('\n')
    .trim();
}

function occurrenceAddress(item) {
  return JSON.stringify([
    item.locale, item.route, item.state, item.viewport.key, item.kind,
    item.selector, item.attribute, item.accessiblePath, item.occurrenceIndex,
  ]);
}

function pointerEscape(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function walkAccessible(value, pointer = '', output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkAccessible(item, `${pointer}/${index}`, output));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = `${pointer}/${pointerEscape(key)}`;
      if (normalizePublicValue(key)) output.push({ path: next, value: normalizePublicValue(key) });
      walkAccessible(child, next, output);
    }
  } else if (typeof value === 'string' && normalizePublicValue(value)) {
    output.push({ path: pointer || '/', value: normalizePublicValue(value) });
  }
  return output;
}

function normalizeVolatile(item) {
  if (item.kind === 'jsonld' && item.selector.endsWith('/dateModified')) {
    if (Number.isNaN(Date.parse(item.value))) throw new Error(`Invalid dateModified: ${item.value}`);
    return { ...item, value: '<DEPLOYED_AT>' };
  }
  if (item.volatile === 'footer-deployed') {
    const match = item.value.match(/^(deployed)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})Z$/);
    if (!match || Number.isNaN(Date.parse(`${match[2]}T${match[3]}:00Z`))) {
      throw new Error(`Invalid baseline footer deployment: ${item.value}`);
    }
    return { ...item, value: `${match[1]} <DEPLOYED_AT_MINUTE>` };
  }
  return item;
}

async function openReady(page, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', 'true'); await page.evaluate(() => window.scrollTo(0, 0)); await expect(page.locator('.back-to-top')).toHaveAttribute('aria-hidden', 'true');
}

async function captureState(page, occurrences, routeInfo, state, viewport, action) {
  await openReady(page, routeInfo.route, viewport);
  if (action) await action(page); if (state !== 'mobile-actions-visible') { await page.evaluate(() => window.scrollTo(0, 0)); await expect(page.locator('.back-to-top')).toHaveAttribute('aria-hidden', 'true'); }
  occurrences.push(...await extractPageOccurrences(page, { ...routeInfo, state, viewport }));
}

async function dynamicStateDescriptors(page, routeInfo, viewport) {
  await openReady(page, routeInfo.route, viewport);
  return page.evaluate(() => ({
    capabilities: [...document.querySelectorAll('[data-capability-control]')]
      .map((item) => item.dataset.capabilityControl),
    timelines: document.querySelectorAll('.timeline-node .timeline-expand-btn').length,
    domains: [...document.querySelectorAll('.skill-domain-card[data-domain]')]
      .map((item) => item.dataset.domain),
  }));
}

async function extractDom(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      if (!element || element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && !['hidden', 'collapse'].includes(style.visibility)
        && style.contentVisibility !== 'hidden'
        && [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    };
    const unique = (selector) => { try { return document.querySelectorAll(selector).length === 1; } catch { return false; } };
    const selectorFor = (element) => {
      if (element.id && unique(`#${CSS.escape(element.id)}`)) return `#${CSS.escape(element.id)}`;
      for (let current = element; current && current !== document.documentElement; current = current.parentElement) {
        for (const attr of [...current.attributes].filter((item) => item.name.startsWith('data-')).sort((a, b) => a.name.localeCompare(b.name))) {
          const candidate = `[${CSS.escape(attr.name)}=${JSON.stringify(attr.value)}]`;
          if (attr.value && unique(candidate)) return candidate;
        }
      }
      const parts = [];
      for (let current = element; current && current !== document.documentElement; current = current.parentElement) {
        const siblings = [...current.parentElement.children].filter((item) => item.tagName === current.tagName);
        parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
        const candidate = parts.join(' > ');
        if (unique(candidate)) return candidate;
      }
      throw new Error(`No unique selector for ${element.tagName}`);
    };
    const output = [];
    const push = (kind, element, value, attribute = null, extra = {}) => {
      if (!String(value).trim()) return;
      output.push({ kind, selector: selectorFor(element), attribute, accessiblePath: null, value, ...extra });
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || element.closest('script,style,template,noscript') || !visible(element)) continue;
      push('dom-text', element, node.nodeValue, null,
        element.closest('.footer-build__deployed') ? { volatile: 'footer-deployed' } : {});
    }
    for (const element of document.querySelectorAll('[title],[alt],[placeholder],[aria-label],[aria-description],[download]')) {
      if (!visible(element)) continue;
      for (const attribute of ['title', 'alt', 'placeholder', 'aria-label', 'aria-description', 'download']) {
        if (element.hasAttribute(attribute)) push('dom-attribute', element, element.getAttribute(attribute), attribute);
      }
    }
    for (const element of document.querySelectorAll('[aria-live],[role="status"]')) {
      if (visible(element)) push('live-region', element, element.textContent);
    }
    const accessibleSelectors = [...document.querySelectorAll('a,button,summary,input,[role]')]
      .filter(visible)
      .map(selectorFor);
    return { rows: output, accessibleSelectors };
  });
}

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
  const responses = new Map(); const stats = { live: 0, replayed: 0 };
  await context.route(/^https:\/\/resume\.jclee\.me\//, async (route) => {
    if (route.request().method() !== 'GET') return route.continue(); const key = route.request().url();
    if (responses.has(key)) { stats.replayed += 1; return route.fulfill(responses.get(key)); }
    const response = await route.fetch();
    const headers = response.headers();
    delete headers['content-encoding']; delete headers['content-length'];
    const snapshot = { status: response.status(), headers, body: await response.body() };
    if (response.status() < 400) responses.set(key, snapshot);
    stats.live += 1; return route.fulfill(snapshot);
  });
  return stats;
}

async function extractPageOccurrences(page, context) {
  const dom = await extractDom(page);
  const raw = [
    ...dom.rows,
    ...await extractAccessible(page, dom.accessibleSelectors),
    ...await extractNonDom(page),
  ];
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

module.exports = {
  captureState,
  dynamicStateDescriptors,
  extractPageOccurrences,
  installProductionResponseCache,
  normalizePublicValue,
  occurrenceAddress,
};
