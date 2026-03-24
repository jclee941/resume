describe('@resume/shared/browser/service', () => {
  let BrowserService;
  let launchMock;
  let generateFingerprintMock;
  let applyStealthPatchesMock;
  let humanDelayMock;

  const createPage = () => ({
    setDefaultNavigationTimeout: jest.fn(),
    setDefaultTimeout: jest.fn(),
    goto: jest.fn().mockResolvedValue({ status: () => 201 }),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    content: jest.fn().mockResolvedValue('<html>ok</html>'),
    cookies: jest.fn().mockResolvedValue([
      { name: 'sid', value: 'abc' },
      { name: 'lang', value: 'ko' },
    ]),
    url: jest.fn().mockReturnValue('https://example.com/final'),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.resetModules();

    launchMock = jest.fn();
    generateFingerprintMock = jest.fn().mockReturnValue({
      ua: 'mock-ua',
      acceptLanguage: 'ko',
      viewport: { width: 1200, height: 800 },
    });
    applyStealthPatchesMock = jest.fn().mockResolvedValue(undefined);
    humanDelayMock = jest.fn().mockResolvedValue(undefined);

    jest.unstable_mockModule('@cloudflare/puppeteer', () => ({
      default: {
        launch: launchMock,
      },
    }));

    jest.unstable_mockModule('@resume/shared/browser/stealth', () => ({
      generateFingerprint: generateFingerprintMock,
      applyStealthPatches: applyStealthPatchesMock,
      humanDelay: humanDelayMock,
    }));

    ({ BrowserService } = await import('@resume/shared/browser/service'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('constructor initializes with defaults and null fingerprint', () => {
    const service = new BrowserService({ MYBROWSER: {} });
    expect(service.getFingerprint()).toBeNull();
  });

  test('newPage launches browser, applies defaults and stealth patches', async () => {
    const page = createPage();
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService(
      { MYBROWSER: { binding: 'b' } },
      { pageTimeoutMs: 1234, stealth: true }
    );
    const created = await service.newPage();

    expect(created).toBe(page);
    expect(launchMock).toHaveBeenCalledWith({ binding: 'b' });
    expect(generateFingerprintMock).toHaveBeenCalledTimes(1);
    expect(page.setDefaultNavigationTimeout).toHaveBeenCalledWith(1234);
    expect(page.setDefaultTimeout).toHaveBeenCalledWith(1234);
    expect(applyStealthPatchesMock).toHaveBeenCalledWith(page, {
      ua: 'mock-ua',
      acceptLanguage: 'ko',
      viewport: { width: 1200, height: 800 },
    });

    const fp = service.getFingerprint();
    expect(fp).toEqual({
      ua: 'mock-ua',
      acceptLanguage: 'ko',
      viewport: { width: 1200, height: 800 },
    });
    fp.ua = 'changed';
    expect(service.getFingerprint().ua).toBe('mock-ua');
  });

  test('newPage reuses connected browser and does not relaunch', async () => {
    const page1 = createPage();
    const page2 = createPage();
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService({ MYBROWSER: { binding: 'b' } }, { stealth: false });

    await service.newPage();
    browser.isConnected.mockReturnValue(true);
    await service.newPage();

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(generateFingerprintMock).toHaveBeenCalledTimes(1);
    expect(applyStealthPatchesMock).not.toHaveBeenCalled();
  });

  test('browse returns structured result with wait selector/waitMs/screenshot', async () => {
    const page = createPage();
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1255);
    const service = new BrowserService({ MYBROWSER: {} }, { pageTimeoutMs: 2222, stealth: true });

    const result = await service.browse('https://example.com', {
      waitForSelector: '#main',
      waitMs: 700,
      screenshot: true,
    });

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 2222,
    });
    expect(page.waitForSelector).toHaveBeenCalledWith('#main', { timeout: 2222 });
    expect(humanDelayMock).toHaveBeenCalledWith(page, 700, 1200);
    expect(result).toEqual({
      content: '<html>ok</html>',
      status: 201,
      url: 'https://example.com/final',
      cookies: { sid: 'abc', lang: 'ko' },
      durationMs: 255,
      screenshot: Buffer.from('png'),
    });
    expect(page.close).toHaveBeenCalledTimes(1);
    expect(nowSpy).toHaveBeenCalledTimes(2);
  });

  test('browse handles null response status and swallows close errors', async () => {
    const page = createPage();
    page.goto.mockResolvedValue(null);
    page.close.mockRejectedValue(new Error('close failed'));
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService({ MYBROWSER: {} }, { stealth: false });
    const result = await service.browse('https://example.com');

    expect(result.status).toBe(0);
    expect(page.waitForSelector).not.toHaveBeenCalled();
    expect(humanDelayMock).not.toHaveBeenCalled();
  });

  test('withPage navigates, returns callback result, and closes page', async () => {
    const page = createPage();
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService({ MYBROWSER: {} }, { pageTimeoutMs: 4444 });
    const value = await service.withPage('https://example.com/x', async (p) => {
      expect(p).toBe(page);
      return 'done';
    });

    expect(value).toBe('done');
    expect(page.goto).toHaveBeenCalledWith('https://example.com/x', {
      waitUntil: 'domcontentloaded',
      timeout: 4444,
    });
    expect(page.close).toHaveBeenCalledTimes(1);
  });

  test('withPage closes page when callback throws and swallows close error', async () => {
    const page = createPage();
    page.close.mockRejectedValue(new Error('close failed'));
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService({ MYBROWSER: {} });

    await expect(
      service.withPage('https://example.com', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(page.close).toHaveBeenCalledTimes(1);
  });

  test('close shuts down browser, resets state, and handles close rejection', async () => {
    const page = createPage();
    const browser = {
      isConnected: jest.fn().mockReturnValue(false),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockRejectedValue(new Error('close failed')),
    };
    launchMock.mockResolvedValue(browser);

    const service = new BrowserService({ MYBROWSER: {} }, { acceptLanguage: 'en-US' });

    await service.newPage();
    expect(service.getFingerprint().acceptLanguage).toBe('en-US');

    await service.close();

    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(service.getFingerprint()).toBeNull();
  });

  test('close does nothing when browser was never launched', async () => {
    const service = new BrowserService({ MYBROWSER: {} });
    await expect(service.close()).resolves.toBeUndefined();
  });
});
