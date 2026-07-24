const { test, expect } = require('@playwright/test');
const { requestOptions, skipIfLocalRateLimited } = require('./pwa-helpers.js');

test.describe('Progressive Web App (PWA)', () => {
  test('should serve valid manifest.json', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const manifest = await response.json();

    // Check required fields
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0c0c12');
    expect(manifest.background_color).toBe('#0f0f23');

    // Check icons
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Check shortcuts
    expect(manifest.shortcuts).toBeInstanceOf(Array);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
  });

  test('manifest should have valid shortcuts', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    // Check shortcuts structure
    manifest.shortcuts.forEach((shortcut) => {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toBeTruthy();
      expect(shortcut.url).toMatch(/^\/|#/);
    });

    // Should have Resume, Projects, Contact shortcuts
    const shortcutNames = manifest.shortcuts.map((s) => s.name);
    expect(shortcutNames).toContain('Resume');
    expect(shortcutNames).toContain('Projects');
    expect(shortcutNames).toContain('Contact');
  });

  test('manifest should have correct language settings', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    expect(manifest.lang).toBe('ko-KR');
    expect(manifest.dir).toBe('ltr');
  });

  test('manifest should be installable', async ({ request }, testInfo) => {
    const response = await request.get('/manifest.json', requestOptions(testInfo));
    skipIfLocalRateLimited(response, '/manifest.json', testInfo);
    const manifest = await response.json();

    // Check installability criteria
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Check for required icon sizes (192x192 and 512x512)
    const iconSizes = manifest.icons.map((icon) => icon.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
  });
});
