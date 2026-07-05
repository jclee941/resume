import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BrowserProfileSync } from '../browser-profile-sync.js';
import { RememberProfileSync } from '../remember/remember-profile-sync.js';
import { StealthBrowserCrawler } from '../../src/crawlers/stealth-browser-crawler.js';

describe('browser readiness waits', () => {
  it('BrowserProfileSync waits for configured profile selectors before scraping', async () => {
    const sync = new BrowserProfileSync({
      selectors: {
        name: '.profile-name',
        headline: '.headline',
        skills: '.skill-tag',
      },
    });
    const calls = [];
    sync.page = {
      async waitForFunction(fn, selectors, options) {
        calls.push({ selectors, options });
        assert.equal(typeof fn, 'function');
      },
    };

    await sync.waitForConfiguredProfileSelectors();

    assert.deepEqual(calls, [
      {
        selectors: ['.profile-name', '.headline', '.skill-tag'],
        options: { timeout: 10000 },
      },
    ]);
  });

  it('BrowserProfileSync waits for configured edit selectors before filling', async () => {
    const sync = new BrowserProfileSync({
      selectors: {
        nameInput: 'input[name="name"]',
        emailInput: 'input[name="email"]',
        phoneInput: 'input[name="phone"]',
      },
    });
    let selectorsSeen = null;
    sync.page = {
      async waitForFunction(_fn, selectors) {
        selectorsSeen = selectors;
      },
    };

    await sync.waitForConfiguredEditSelectors();

    assert.deepEqual(selectorsSeen, [
      'input[name="name"]',
      'input[name="email"]',
      'input[name="phone"]',
    ]);
  });

  it('StealthBrowserCrawler defaults to domcontentloaded while allowing explicit overrides', () => {
    const defaultCrawler = new StealthBrowserCrawler('default', { env: { MYBROWSER: {} } });
    const explicitCrawler = new StealthBrowserCrawler('explicit', {
      env: { MYBROWSER: {} },
      waitUntil: 'load',
    });

    assert.equal(defaultCrawler.waitUntil, 'domcontentloaded');
    assert.equal(explicitCrawler.waitUntil, 'load');
  });

  it('RememberProfileSync.checkLogin returns false on login redirect without waiting for profile DOM', async () => {
    const sync = new RememberProfileSync();
    let waitedForProfile = false;
    sync.page = {
      async goto(_url, options) {
        assert.deepEqual(options, { waitUntil: 'domcontentloaded' });
      },
      url() {
        return 'https://career.rememberapp.co.kr/login';
      },
      async waitForSelector() {
        waitedForProfile = true;
      },
    };

    const loggedIn = await sync.checkLogin();

    assert.equal(loggedIn, false);
    assert.equal(waitedForProfile, false);
  });
});
