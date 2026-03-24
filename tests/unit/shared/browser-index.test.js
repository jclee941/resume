describe('@resume/shared/browser index barrel', () => {
  let barrel;
  let sourceBarrel;
  let stealth;
  let service;

  beforeAll(async () => {
    barrel = await import('@resume/shared/browser');
    sourceBarrel = await import('../../../packages/shared/src/browser/index.js');
    stealth = await import('@resume/shared/browser/stealth');
    service = await import('@resume/shared/browser/service');
  });

  test('re-exports stealth helpers from browser index', () => {
    expect(barrel.generateFingerprint).toBe(stealth.generateFingerprint);
    expect(barrel.getRandomViewport).toBe(stealth.getRandomViewport);
    expect(barrel.applyStealthPatches).toBe(stealth.applyStealthPatches);
    expect(barrel.humanDelay).toBe(stealth.humanDelay);
  });

  test('re-exports BrowserService from browser index', () => {
    expect(barrel.BrowserService).toBe(service.BrowserService);
  });

  test('source barrel module resolves the same exported bindings', () => {
    expect(sourceBarrel.generateFingerprint).toBe(stealth.generateFingerprint);
    expect(sourceBarrel.getRandomViewport).toBe(stealth.getRandomViewport);
    expect(sourceBarrel.applyStealthPatches).toBe(stealth.applyStealthPatches);
    expect(sourceBarrel.humanDelay).toBe(stealth.humanDelay);
    expect(sourceBarrel.BrowserService).toBe(service.BrowserService);
  });
});
