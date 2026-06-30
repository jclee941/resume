const CONTROL_SELECTOR = 'a,button,input[type="button"],input[type="submit"]';

export async function settlePage(page) {
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(800).catch(() => {});
  }
}

export async function inspectApplicationPage(page) {
  return await page.evaluate((selector) => {
    const doc = globalThis.document;
    const controls = Array.from(doc.querySelectorAll(selector))
      .map((node, index) => {
        const actionId = `cf-native-${index}`;
        node.setAttribute('data-cf-native-control', actionId);
        const text = (
          node.innerText ||
          node.value ||
          node.getAttribute('aria-label') ||
          node.textContent ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim();
        return {
          text,
          selector: `[data-cf-native-control="${actionId}"]`,
          href: node.href || node.getAttribute('href') || '',
          disabled: Boolean(node.disabled || node.getAttribute('aria-disabled') === 'true'),
        };
      })
      .filter((control) => control.text || control.href)
      .slice(0, 40);

    return {
      bodyText: (doc.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 5000),
      controls,
    };
  }, CONTROL_SELECTOR);
}

export async function clickControl(page, control) {
  if (!control?.selector) return false;
  const handle = await page.$?.(control.selector);
  if (!handle) return false;
  await handle.click();
  await settlePage(page);
  return true;
}
