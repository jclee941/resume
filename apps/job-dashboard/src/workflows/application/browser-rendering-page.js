const CONTROL_SELECTOR = 'a,button,input[type="button"],input[type="submit"]';

/**
 * @param {{ waitForTimeout?: (ms: number) => Promise<unknown> }} page
 * @returns {Promise<void>}
 */
export async function settlePage(page) {
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(800).catch(() => {});
  }
}

/**
 * @typedef {Object} PageControl
 * @property {string} text
 * @property {string} selector
 * @property {string} href
 * @property {boolean} disabled
 */

/**
 * @typedef {Object} InspectablePage
 * @property {(fn: (selector: string) => { bodyText: string, controls: PageControl[] }, arg: string) => Promise<{ bodyText: string, controls: PageControl[] }>} evaluate
 */

/**
 * @param {InspectablePage} page
 * @returns {Promise<{ bodyText: string, controls: PageControl[] }>}
 */
export async function inspectApplicationPage(page) {
  return await page.evaluate((/** @type {string} */ selector) => {
    const doc = globalThis.document;
    const controls = Array.from(
      /** @type {NodeListOf<HTMLElement & { value?: string, href?: string, disabled?: boolean }>} */ (
        doc.querySelectorAll(selector)
      )
    )
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

/**
 * @typedef {Object} ClickableElement
 * @property {() => Promise<unknown>} click
 */

/**
 * @typedef {Object} PageWithClick
 * @property {((selector: string) => Promise<ClickableElement | null>)} [$]
 * @property {((ms: number) => Promise<unknown>)} [waitForTimeout]
 */

/**
 * @param {PageWithClick} page
 * @param {{ selector?: string } | null | undefined} control
 * @returns {Promise<boolean>}
 */
export async function clickControl(page, control) {
  if (!control?.selector) return false;
  const handle = await page.$?.(control.selector);
  if (!handle) return false;
  await handle.click();
  await settlePage(page);
  return true;
}
