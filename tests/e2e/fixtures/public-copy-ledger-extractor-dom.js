async function extractDom(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      if (!element || element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && !['hidden', 'collapse'].includes(style.visibility) && style.contentVisibility !== 'hidden' && [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    };
    const unique = (selector) => {
      try { return document.querySelectorAll(selector).length === 1; } catch { return false; }
    };
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
      push('dom-text', element, node.nodeValue, null, element.closest('.footer-build__deployed') ? { volatile: 'footer-deployed' } : {});
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
    const accessibleSelectors = [...document.querySelectorAll('a,button,summary,input,[role]')].filter(visible).map(selectorFor);
    return { rows: output, accessibleSelectors };
  });
}

module.exports = { extractDom };
