describe('@resume/shared/browser/stealth-patches', () => {
  let mod;

  const withPatchedGlobals = async (setup, run) => {
    const snapshots = [];
    const setGlobal = (key, value) => {
      const hadOwn = Object.prototype.hasOwnProperty.call(globalThis, key);
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
      snapshots.push({ key, hadOwn, descriptor });
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    };

    try {
      await setup(setGlobal);
      await run();
    } finally {
      for (let i = snapshots.length - 1; i >= 0; i -= 1) {
        const { key, hadOwn, descriptor } = snapshots[i];
        if (hadOwn) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete globalThis[key];
        }
      }
    }
  };

  const runPrimaryStealthScript = async (scriptFn) => {
    await withPatchedGlobals(
      async (setGlobal) => {
        const navigatorMock = {
          permissions: {
            query: jest.fn(async (parameters) => ({
              state: parameters?.name === 'notifications' ? 'granted' : 'other',
              onchange: null,
            })),
          },
        };
        const windowMock = { navigator: navigatorMock };

        class WebGLRenderingContextMock {
          getParameter(parameter) {
            return `orig-${parameter}`;
          }
        }

        class WebGL2RenderingContextMock {
          getParameter(parameter) {
            return `orig2-${parameter}`;
          }
        }

        class HTMLCanvasElementMock {
          constructor() {
            this.width = 1;
            this.height = 1;
          }

          getContext(type) {
            if (type !== '2d') {
              return null;
            }

            return {
              getImageData: () => ({ data: new Uint8ClampedArray([10, 20, 30, 255]) }),
              putImageData: jest.fn(),
            };
          }

          toDataURL() {
            return 'data:orig';
          }
        }

        class AudioBufferMock {
          getChannelData(channel) {
            if (channel === 9) {
              return new Float32Array(0);
            }
            return new Float32Array(200).fill(1);
          }
        }

        setGlobal('navigator', navigatorMock);
        setGlobal('window', windowMock);
        setGlobal('Notification', { permission: 'granted' });
        setGlobal('screen', {});
        setGlobal('WebGLRenderingContext', WebGLRenderingContextMock);
        setGlobal('WebGL2RenderingContext', WebGL2RenderingContextMock);
        setGlobal('HTMLCanvasElement', HTMLCanvasElementMock);
        setGlobal('AudioBuffer', AudioBufferMock);
      },
      async () => {
        scriptFn();

        expect(navigator.webdriver).toBe(false);
        expect(navigator.languages).toEqual(['ko-KR', 'ko', 'en-US', 'en']);

        const plugins = navigator.plugins;
        expect(plugins.item(0).name).toContain('Chrome PDF Plugin');
        expect(plugins.item(999)).toBeNull();
        expect(plugins.namedItem('Native Client').filename).toContain('nacl');
        expect(plugins.namedItem('Missing Plugin')).toBeNull();
        expect(plugins.refresh()).toBeUndefined();

        const mimeTypes = navigator.mimeTypes;
        expect(mimeTypes.item(0).type).toBe('application/pdf');
        expect(mimeTypes.item(999)).toBeNull();
        expect(mimeTypes.namedItem('application/x-google-chrome-pdf').description).toContain(
          'Portable Document Format'
        );
        expect(mimeTypes.namedItem('application/unknown')).toBeNull();

        expect(window.chrome.runtime.PlatformOs.LINUX).toBe('linux');
        const notificationPermission = await navigator.permissions.query({ name: 'notifications' });
        expect(notificationPermission.state).toBe('granted');
        const fallbackPermission = await navigator.permissions.query({ name: 'camera' });
        expect(fallbackPermission.state).toBe('other');

        const gl = new WebGLRenderingContext();
        expect(gl.getParameter(37445)).toBe('Intel Inc.');
        expect(gl.getParameter(37446)).toBe('Intel Iris OpenGL Engine');
        expect(gl.getParameter(1)).toBe('orig-1');

        const gl2 = new WebGL2RenderingContext();
        expect(gl2.getParameter(37445)).toBe('Intel Inc.');
        expect(gl2.getParameter(37446)).toBe('Intel Iris OpenGL Engine');
        expect(gl2.getParameter(2)).toBe('orig2-2');

        const canvas = new HTMLCanvasElement();
        expect(canvas.toDataURL()).toBe('data:orig');

        const audio = new AudioBuffer();
        const channelData = audio.getChannelData(1);
        expect(channelData[0]).not.toBe(1);
        expect(channelData[1]).toBe(1);
        expect(audio.getChannelData(9)).toHaveLength(0);
      }
    );
  };

  const runPrimaryStealthScriptWithExistingRuntime = async (scriptFn) => {
    await withPatchedGlobals(
      async (setGlobal) => {
        const originalPermissions = { query: 'not-a-function' };
        const originalRuntime = { Existing: 'keep-me' };
        const navigatorMock = {
          permissions: originalPermissions,
        };
        const windowMock = {
          navigator: navigatorMock,
          chrome: { runtime: originalRuntime },
        };

        class WebGLRenderingContextMock {
          getParameter(parameter) {
            return `orig-${parameter}`;
          }
        }

        class HTMLCanvasElementMock {
          getContext() {
            return null;
          }

          toDataURL() {
            return 'data:no-context';
          }
        }

        class AudioBufferMock {
          getChannelData() {
            return new Float32Array([1, 1, 1]);
          }
        }

        setGlobal('navigator', navigatorMock);
        setGlobal('window', windowMock);
        setGlobal('Notification', { permission: 'denied' });
        setGlobal('screen', {});
        setGlobal('WebGLRenderingContext', WebGLRenderingContextMock);
        setGlobal('WebGL2RenderingContext', undefined);
        setGlobal('HTMLCanvasElement', HTMLCanvasElementMock);
        setGlobal('AudioBuffer', AudioBufferMock);
      },
      async () => {
        scriptFn();

        expect(window.chrome.runtime.Existing).toBe('keep-me');
        expect(navigator.permissions.query).toBe('not-a-function');

        const gl = new WebGLRenderingContext();
        expect(gl.getParameter(37445)).toBe('Intel Inc.');
        expect(gl.getParameter(37446)).toBe('Intel Iris OpenGL Engine');

        const canvas = new HTMLCanvasElement();
        expect(canvas.toDataURL()).toBe('data:no-context');
      }
    );
  };

  const runFingerprintScript = async (scriptFn, fingerprint) => {
    await withPatchedGlobals(
      async (setGlobal) => {
        setGlobal('navigator', {});
        setGlobal('screen', {});
      },
      async () => {
        scriptFn(fingerprint);
        expect(navigator.platform).toBe(fingerprint.platform);
        expect(navigator.hardwareConcurrency).toBe(fingerprint.hardwareConcurrency);
        expect(navigator.deviceMemory).toBe(fingerprint.deviceMemory);
        expect(screen.width).toBe(fingerprint.screenResolution.width);
        expect(screen.height).toBe(fingerprint.screenResolution.height);
        expect(screen.colorDepth).toBe(fingerprint.colorDepth);
      }
    );
  };

  beforeAll(async () => {
    mod = await import('@resume/shared/browser/stealth');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getRandomViewport returns a valid viewport shape', () => {
    const viewport = mod.getRandomViewport();
    expect(typeof viewport.width).toBe('number');
    expect(typeof viewport.height).toBe('number');
    expect(viewport.width).toBeGreaterThan(0);
    expect(viewport.height).toBeGreaterThan(0);
    if (viewport.isMobile !== undefined) {
      expect(typeof viewport.isMobile).toBe('boolean');
      expect(typeof viewport.deviceScaleFactor).toBe('number');
    }
  });

  test('generateFingerprint builds Linux fingerprint shape with deterministic random values', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.17)
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.7);

    const fp = mod.generateFingerprint();

    expect(typeof fp.ua).toBe('string');
    expect(fp.ua).toContain('Mozilla/5.0');
    expect(fp.platform).toBe('Linux x86_64');
    expect(fp.viewport).toEqual({
      width: 412,
      height: 915,
      isMobile: true,
      deviceScaleFactor: 2.625,
    });
    expect(fp.acceptLanguage).toBe('ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(fp.hardwareConcurrency).toBe(8);
    expect(fp.deviceMemory).toBe(16);
    expect(fp.screenResolution).toEqual({ width: 412, height: 915 });
    expect(fp.colorDepth).toBe(24);
    expect(randomSpy).toHaveBeenCalledTimes(4);
  });

  test('generateFingerprint sets Mac platform when UA contains Macintosh', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const fp = mod.generateFingerprint();
    expect(fp.ua).toContain('Macintosh');
    expect(fp.platform).toBe('MacIntel');
  });

  test('generateFingerprint defaults to Win32 when UA has no Macintosh or Linux', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const fp = mod.generateFingerprint();
    expect(fp.platform).toBe('Win32');
  });

  test('humanDelay calls waitForTimeout with value in default range', async () => {
    const page = { waitForTimeout: jest.fn().mockResolvedValue(undefined) };
    await mod.humanDelay(page);
    expect(page.waitForTimeout).toHaveBeenCalledTimes(1);
    const delay = page.waitForTimeout.mock.calls[0][0];
    expect(typeof delay).toBe('number');
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThanOrEqual(2000);
  });

  test('humanDelay honors explicit min/max values', async () => {
    const page = { waitForTimeout: jest.fn().mockResolvedValue(undefined) };
    await mod.humanDelay(page, 12, 12);
    expect(page.waitForTimeout).toHaveBeenCalledWith(12);
  });

  test('applyStealthPatches applies all page settings and injects fingerprint patch', async () => {
    const page = {
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      evaluateOnNewDocument: jest.fn().mockImplementation(async (fn, arg) => {
        if (arg === undefined) {
          await runPrimaryStealthScript(fn);
        } else {
          await runFingerprintScript(fn, arg);
        }
      }),
    };
    const fp = {
      ua: 'ua',
      viewport: { width: 100, height: 200 },
      acceptLanguage: 'ko',
      platform: 'Linux x86_64',
      hardwareConcurrency: 8,
      deviceMemory: 16,
      screenResolution: { width: 100, height: 200 },
      colorDepth: 24,
    };

    await mod.applyStealthPatches(page, fp);

    expect(page.setUserAgent).toHaveBeenCalledWith('ua');
    expect(page.setViewport).toHaveBeenCalledWith({ width: 100, height: 200 });
    expect(page.setExtraHTTPHeaders).toHaveBeenCalledWith({ 'Accept-Language': 'ko' });
    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(2);
    expect(typeof page.evaluateOnNewDocument.mock.calls[0][0]).toBe('function');
    expect(typeof page.evaluateOnNewDocument.mock.calls[1][0]).toBe('function');
    expect(page.evaluateOnNewDocument.mock.calls[1][1]).toEqual(fp);
  });

  test('applyStealthPatches skips optional header/UA/viewport setters and second patch without fingerprint', async () => {
    const page = {
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
    };

    await mod.applyStealthPatches(page);

    expect(page.setUserAgent).not.toHaveBeenCalled();
    expect(page.setViewport).not.toHaveBeenCalled();
    expect(page.setExtraHTTPHeaders).not.toHaveBeenCalled();
    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(1);
    expect(typeof page.evaluateOnNewDocument.mock.calls[0][0]).toBe('function');
  });

  test('applyStealthPatches primary script handles pre-existing runtime and no WebGL2/canvas context', async () => {
    const page = {
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      evaluateOnNewDocument: jest.fn().mockImplementation(async (fn, arg) => {
        if (arg === undefined) {
          await runPrimaryStealthScriptWithExistingRuntime(fn);
        }
      }),
    };

    await mod.applyStealthPatches(page);

    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(1);
  });

  test('applyStealthPatches fingerprint patch skips absent fingerprint fields', async () => {
    const page = {
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      evaluateOnNewDocument: jest.fn().mockImplementation(async (fn, arg) => {
        if (arg === undefined) {
          return;
        }
        await withPatchedGlobals(
          async (setGlobal) => {
            setGlobal('navigator', {});
            setGlobal('screen', {});
          },
          async () => {
            fn(arg);
            expect(navigator.platform).toBe('Win32');
            expect(navigator.hardwareConcurrency).toBeUndefined();
            expect(navigator.deviceMemory).toBeUndefined();
            expect(screen.width).toBeUndefined();
            expect(screen.height).toBeUndefined();
            expect(screen.colorDepth).toBeUndefined();
          }
        );
      }),
    };

    await mod.applyStealthPatches(page, { platform: 'Win32' });

    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(2);
  });

  test('applyStealthPatches fingerprint patch skips platform when platform is absent', async () => {
    const page = {
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      evaluateOnNewDocument: jest.fn().mockImplementation(async (fn, arg) => {
        if (arg === undefined) {
          return;
        }
        await withPatchedGlobals(
          async (setGlobal) => {
            setGlobal('navigator', {});
            setGlobal('screen', {});
          },
          async () => {
            fn(arg);
            expect(navigator.platform).toBeUndefined();
            expect(navigator.hardwareConcurrency).toBe(4);
          }
        );
      }),
    };

    await mod.applyStealthPatches(page, { hardwareConcurrency: 4 });

    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(2);
  });
});
