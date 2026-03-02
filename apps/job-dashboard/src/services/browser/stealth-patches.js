/**
 * Cloudflare Browser Rendering stealth patch helpers.
 */

const CHROME_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.109 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.139 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.92 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.116 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.101 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.89 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.138 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.119 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.84 Safari/537.36',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1600, height: 900 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1280, height: 720 },
  { width: 1170, height: 2532, isMobile: true, deviceScaleFactor: 3 },
  { width: 1080, height: 2400, isMobile: true, deviceScaleFactor: 2.75 },
  { width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 },
  { width: 412, height: 915, isMobile: true, deviceScaleFactor: 2.625 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @returns {string}
 */
export function getRandomUA() {
  return CHROME_USER_AGENTS[randomInt(0, CHROME_USER_AGENTS.length - 1)];
}

/**
 * @returns {{ width: number, height: number, isMobile?: boolean, deviceScaleFactor?: number }}
 */
export function getRandomViewport() {
  return VIEWPORTS[randomInt(0, VIEWPORTS.length - 1)];
}

/**
 * Apply anti-fingerprinting patches before document scripts run.
 *
 * @param {import('@cloudflare/puppeteer').Page} page
 */
/**
 * Generate a consistent fingerprint for a browser session.
 * @returns {{ ua: string, viewport: { width: number, height: number }, acceptLanguage: string, platform: string, hardwareConcurrency: number, deviceMemory: number, screenResolution: { width: number, height: number }, colorDepth: number }}
 */
export function generateFingerprint() {
  const ua = getRandomUA();
  const viewport = getRandomViewport();

  // Derive platform from UA OS string for fingerprint consistency
  let platform = 'Win32';
  if (ua.includes('Macintosh')) {
    platform = 'MacIntel';
  } else if (ua.includes('Linux')) {
    platform = 'Linux x86_64';
  }

  const concurrencyOptions = [4, 8, 12, 16];
  const memoryOptions = [4, 8, 16];

  return {
    ua,
    viewport,
    acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    platform,
    hardwareConcurrency: concurrencyOptions[randomInt(0, concurrencyOptions.length - 1)],
    deviceMemory: memoryOptions[randomInt(0, memoryOptions.length - 1)],
    screenResolution: { width: viewport.width, height: viewport.height },
    colorDepth: 24,
  };
}

/**
 * Human-like delay using page.waitForTimeout.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
export async function humanDelay(page, min = 500, max = 2000) {
  const delay = randomInt(min, max);
  await page.waitForTimeout(delay);
}

/**
 * Apply anti-fingerprinting patches before document scripts run.
 *
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {{ ua?: string, viewport?: { width: number, height: number }, acceptLanguage?: string, platform?: string, hardwareConcurrency?: number, deviceMemory?: number, screenResolution?: { width: number, height: number }, colorDepth?: number }} [fingerprint]
 */
export async function applyStealthPatches(page, fingerprint) {
  if (fingerprint?.ua) {
    await page.setUserAgent(fingerprint.ua);
  }
  if (fingerprint?.viewport) {
    await page.setViewport(fingerprint.viewport);
  }
  if (fingerprint?.acceptLanguage) {
    await page.setExtraHTTPHeaders({ 'Accept-Language': fingerprint.acceptLanguage });
  }

  await page.evaluateOnNewDocument(() => {
    const patchProperty = (obj, key, getter) => {
      Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: getter,
      });
    };

    patchProperty(navigator, 'webdriver', () => false);
    patchProperty(navigator, 'languages', () => ['ko-KR', 'ko', 'en-US', 'en']);
    patchProperty(navigator, 'plugins', () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ];
      return Object.assign(plugins, {
        item: (index) => plugins[index] || null,
        namedItem: (name) => plugins.find((plugin) => plugin.name === name) || null,
        refresh: () => undefined,
      });
    });

    patchProperty(navigator, 'mimeTypes', () => {
      const mimeTypes = [
        {
          type: 'application/pdf',
          suffixes: 'pdf',
          description: 'Portable Document Format',
        },
        {
          type: 'application/x-google-chrome-pdf',
          suffixes: 'pdf',
          description: 'Portable Document Format',
        },
      ];

      return Object.assign(mimeTypes, {
        item: (index) => mimeTypes[index] || null,
        namedItem: (type) => mimeTypes.find((entry) => entry.type === type) || null,
      });
    });

    if (!window.chrome) {
      window.chrome = {};
    }

    if (!window.chrome.runtime) {
      window.chrome.runtime = {
        PlatformOs: {
          MAC: 'mac',
          WIN: 'win',
          ANDROID: 'android',
          CROS: 'cros',
          LINUX: 'linux',
          OPENBSD: 'openbsd',
        },
      };
    }

    const originalQuery = window.navigator.permissions?.query;
    if (typeof originalQuery === 'function') {
      window.navigator.permissions.query = (parameters) => {
        if (parameters && parameters.name === 'notifications') {
          return Promise.resolve({
            state: Notification.permission,
            onchange: null,
          });
        }
        return originalQuery.call(window.navigator.permissions, parameters);
      };
    }

    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function patchedGetParameter(parameter) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.call(this, parameter);
    };

    if (typeof WebGL2RenderingContext !== 'undefined') {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function patchedGetParameter2(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter2.call(this, parameter);
      };
    }

    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function patchedToDataURL(...args) {
      const context = this.getContext('2d');
      if (context) {
        const shift = {
          r: Math.floor(Math.random() * 3) - 1,
          g: Math.floor(Math.random() * 3) - 1,
          b: Math.floor(Math.random() * 3) - 1,
          a: 0,
        };

        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i + 0] += shift.r;
          imageData.data[i + 1] += shift.g;
          imageData.data[i + 2] += shift.b;
          imageData.data[i + 3] += shift.a;
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    const originalGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function patchedGetChannelData(channel) {
      const data = originalGetChannelData.call(this, channel);
      if (!data || data.length === 0) {
        return data;
      }

      const deterministicOffset = ((channel + data.length) % 17) * 1e-8;
      for (let i = 0; i < data.length; i += 100) {
        data[i] = data[i] + deterministicOffset;
      }

      return data;
    };
  });

  // Fingerprint consistency patches — navigator/screen properties
  if (fingerprint) {
    await page.evaluateOnNewDocument((fp) => {
      const patchProp = (obj, key, getter) => {
        Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: true,
          get: getter,
        });
      };

      if (fp.platform) {
        patchProp(navigator, 'platform', () => fp.platform);
      }
      if (fp.hardwareConcurrency) {
        patchProp(navigator, 'hardwareConcurrency', () => fp.hardwareConcurrency);
      }
      if (fp.deviceMemory) {
        patchProp(navigator, 'deviceMemory', () => fp.deviceMemory);
      }
      if (fp.screenResolution) {
        patchProp(screen, 'width', () => fp.screenResolution.width);
        patchProp(screen, 'height', () => fp.screenResolution.height);
      }
      if (fp.colorDepth) {
        patchProp(screen, 'colorDepth', () => fp.colorDepth);
      }
    }, fingerprint);
  }
}
