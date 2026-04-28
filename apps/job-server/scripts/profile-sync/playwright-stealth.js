/**
 * Playwright stealth init script — defeats common bot detection vectors.
 *
 * Targets JobKorea/Wanted CAPTCHA triggers without external deps.
 * Applied via context.addInitScript before any page script runs.
 */

const STEALTH_INIT = `
(() => {
  // 1. webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. plugins (empty array → suspicious; populate with realistic shape)
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    ],
  });

  // 3. languages
  Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });

  // 4. permissions API (Notification permission inconsistency)
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  }

  // 5. chrome runtime (headless missing → flag)
  if (!window.chrome) {
    window.chrome = { runtime: {}, app: {}, csi: () => {}, loadTimes: () => {} };
  }

  // 6. WebGL vendor/renderer (headless leaks SwiftShader)
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (parameter) {
    if (parameter === 37445) return 'Intel Inc.';
    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter.apply(this, arguments);
  };

  // 7. hardware concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

  // 8. deviceMemory
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

  // 9. platform
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
})();
`;

/**
 * Apply stealth patches to a Playwright BrowserContext.
 * @param {import('playwright').BrowserContext} context
 */
export async function applyPlaywrightStealth(context) {
  await context.addInitScript({ content: STEALTH_INIT });
}
