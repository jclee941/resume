/**
 * Cloudflare Browser Rendering stealth patch helpers.
 */

export { getRandomViewport, generateFingerprint, humanDelay } from './stealth-fingerprint.js';

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

  // Fingerprint consistency patches - navigator/screen properties
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
