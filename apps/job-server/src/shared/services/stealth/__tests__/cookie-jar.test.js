import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CookieJar } from '../cookie-jar.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('CookieJar', () => {
  it('setCookie noops for missing name or domain and normalizes domain/path', () => {
    const jar = new CookieJar();

    jar.setCookie({ value: 'v', domain: 'example.com' });
    jar.setCookie({ name: 'a', value: 'v' });
    assert.equal(jar.size, 0);

    jar.setCookie({ name: 'one', value: '1', domain: 'example.com' });
    jar.setCookie({ name: 'two', value: '2', domain: '.example.com', path: '/x' });

    const exported = jar.exportCookies();
    assert.equal(exported.length, 2);
    assert.equal(exported.find((c) => c.name === 'one').domain, '.example.com');
    assert.equal(exported.find((c) => c.name === 'one').path, '/');
    assert.equal(exported.find((c) => c.name === 'two').domain, '.example.com');
    assert.equal(exported.find((c) => c.name === 'two').path, '/x');
  });

  it('setCookiesFromHeader logs and returns on invalid URL', () => {
    const logger = { error: mock.fn() };
    const jar = new CookieJar({ logger });

    jar.setCookiesFromHeader('a=1', 'not-a-url');

    assert.equal(jar.size, 0);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(
      logger.error.mock.calls[0].arguments[0],
      '[CookieJar.setCookiesFromHeader] Invalid URL:'
    );
  });

  it('setCookiesFromHeader handles single and array headers, skips empty, and ignores invalid cookie strings', () => {
    let now = 5000;
    mock.method(Date, 'now', () => now);

    const jar = new CookieJar();

    jar.setCookiesFromHeader('single=1; Path=/single', 'https://example.com/a');

    now = 8000;
    jar.setCookiesFromHeader(
      [
        '',
        null,
        'arrayA=2; Domain=sub.example.com; Path=/a; HttpOnly; Secure; SameSite=Lax; Expires=Wed, 21 Oct 2030 07:28:00 GMT',
        'arrayB=3; Max-Age=2',
        'broken',
      ],
      'https://sub.example.com/a/b'
    );

    const all = jar.exportCookies();
    assert.equal(all.length, 3);

    const single = all.find((c) => c.name === 'single');
    const arrayA = all.find((c) => c.name === 'arrayA');
    const arrayB = all.find((c) => c.name === 'arrayB');

    assert.equal(single.path, '/single');
    assert.equal(arrayA.domain, '.sub.example.com');
    assert.equal(arrayA.path, '/a');
    assert.equal(arrayA.httpOnly, true);
    assert.equal(arrayA.secure, true);
    assert.equal(arrayA.sameSite, 'Lax');
    assert.equal(typeof arrayA.expires, 'number');
    assert.equal(arrayB.expires, 10_000);
  });

  it('getCookies logs and returns empty array for invalid URL', () => {
    const logger = { error: mock.fn() };
    const jar = new CookieJar({ logger });

    const result = jar.getCookies('bad-url');

    assert.deepEqual(result, []);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.error.mock.calls[0].arguments[0], '[CookieJar.getCookies] Invalid URL:');
  });

  it('getCookies filters by expiry, domain, and path and removes expired cookies', () => {
    mock.method(Date, 'now', () => 20_000);

    const jar = new CookieJar();
    jar.setCookie({ name: 'expired', value: 'x', domain: 'example.com', expires: 19_999 });
    jar.setCookie({ name: 'root', value: 'r', domain: 'example.com', path: '/' });
    jar.setCookie({ name: 'sub', value: 's', domain: 'example.com', path: '/a' });
    jar.setCookie({ name: 'other', value: 'o', domain: 'other.com', path: '/' });

    const atRoot = jar.getCookies('https://example.com/');
    const atSub = jar.getCookies('https://foo.example.com/a/b');

    assert.deepEqual(
      atRoot.map((c) => c.name),
      ['root']
    );
    assert.deepEqual(atSub.map((c) => c.name).sort(), ['root', 'sub']);
    assert.equal(
      jar.exportCookies().some((c) => c.name === 'expired'),
      false
    );
  });

  it('getCookieHeader returns empty string or joined cookie values', () => {
    const jar = new CookieJar();

    assert.equal(jar.getCookieHeader('https://example.com/'), '');

    jar.setCookie({ name: 'a', value: '1', domain: 'example.com', path: '/' });
    jar.setCookie({ name: 'b', value: '2', domain: 'example.com', path: '/' });

    assert.equal(jar.getCookieHeader('https://example.com/'), 'a=1; b=2');
  });

  it('removeCookie supports domain with and without leading dot', () => {
    const jar = new CookieJar();
    jar.setCookie({ name: 'n', value: '1', domain: 'example.com', path: '/' });
    jar.setCookie({ name: 'n', value: '2', domain: 'example.com', path: '/x' });
    jar.setCookie({ name: 'm', value: '3', domain: 'example.com', path: '/' });

    jar.removeCookie('n', 'example.com');
    assert.deepEqual(
      jar.exportCookies().map((c) => c.name),
      ['m']
    );

    jar.setCookie({ name: 'n', value: '4', domain: 'example.com', path: '/y' });
    jar.removeCookie('n', '.example.com');
    assert.deepEqual(
      jar.exportCookies().map((c) => c.name),
      ['m']
    );
  });

  it('clearDomain supports domain with and without leading dot', () => {
    const jar = new CookieJar();
    jar.setCookie({ name: 'a', value: '1', domain: 'example.com' });
    jar.setCookie({ name: 'b', value: '2', domain: 'example.com', path: '/x' });
    jar.setCookie({ name: 'c', value: '3', domain: 'other.com' });

    jar.clearDomain('example.com');
    assert.deepEqual(
      jar.exportCookies().map((c) => c.name),
      ['c']
    );

    jar.setCookie({ name: 'd', value: '4', domain: 'other.com' });
    jar.clearDomain('.other.com');
    assert.equal(jar.size, 0);
  });

  it('clearExpired removes only expired cookies', () => {
    mock.method(Date, 'now', () => 1000);

    const jar = new CookieJar();
    jar.setCookie({ name: 'past', value: '1', domain: 'example.com', expires: 999 });
    jar.setCookie({ name: 'future', value: '2', domain: 'example.com', expires: 1001 });
    jar.setCookie({ name: 'session', value: '3', domain: 'example.com' });

    jar.clearExpired();

    assert.deepEqual(
      jar
        .exportCookies()
        .map((c) => c.name)
        .sort(),
      ['future', 'session']
    );
  });

  it('clearAll, importCookies, exportCookies copy behavior, and size getter', () => {
    const jar = new CookieJar();

    jar.importCookies([
      { name: 'x', value: '1', domain: 'example.com' },
      { name: 'y', value: '2', domain: 'example.com', path: '/p' },
    ]);

    assert.equal(jar.size, 2);

    const exported = jar.exportCookies();
    exported.push({ name: 'z', value: '3', domain: '.example.com', path: '/' });
    assert.equal(jar.size, 2);

    jar.clearAll();
    assert.equal(jar.size, 0);
  });

  it('key and domain matching helper methods cover exact, subdomain, and mismatch', () => {
    const jar = new CookieJar();

    assert.equal(jar._key('.example.com', '/a', 'n'), '.example.com|/a|n');
    assert.equal(jar._domainMatches('.example.com', 'example.com'), true);
    assert.equal(jar._domainMatches('.example.com', 'sub.example.com'), true);
    assert.equal(jar._domainMatches('example.com', 'sub.example.com'), true);
    assert.equal(jar._domainMatches('.example.com', 'example.net'), false);
  });

  it('parseSetCookie returns null for invalid forms and parses attribute branches', () => {
    const now = 2000;
    mock.method(Date, 'now', () => now);

    const jar = new CookieJar();

    assert.equal(jar._parseSetCookie('', 'example.com'), null);
    assert.equal(jar._parseSetCookie('novalue', 'example.com'), null);
    assert.equal(jar._parseSetCookie('=x', 'example.com'), null);

    const withInvalidExpires = jar._parseSetCookie(
      'a=1; Expires=not-a-date; Max-Age=oops',
      'example.com'
    );
    assert.equal(withInvalidExpires.name, 'a');
    assert.equal('expires' in withInvalidExpires, false);

    const parsed = jar._parseSetCookie(
      'n=v=1; Domain=sub.example.com; Path=/x; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Max-Age=3; HttpOnly; Secure; SameSite=None',
      'fallback.example.com'
    );

    assert.equal(parsed.name, 'n');
    assert.equal(parsed.value, 'v=1');
    assert.equal(parsed.domain, 'sub.example.com');
    assert.equal(parsed.path, '/x');
    assert.equal(parsed.httpOnly, true);
    assert.equal(parsed.secure, true);
    assert.equal(parsed.sameSite, 'None');
    assert.equal(parsed.expires, 5000);
  });
});
