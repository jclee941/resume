import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseCookieHeader, getCookie, serializeCookie, clearCookie } from '../index.js';

describe('@resume/shared/cookies', () => {
  describe('parseCookieHeader', () => {
    it('returns empty object for null / undefined / empty string', () => {
      assert.deepEqual(parseCookieHeader(null), {});
      assert.deepEqual(parseCookieHeader(undefined), {});
      assert.deepEqual(parseCookieHeader(''), {});
    });

    it('returns empty object for non-string input', () => {
      assert.deepEqual(parseCookieHeader(123), {});
      assert.deepEqual(parseCookieHeader({}), {});
    });

    it('parses a single cookie', () => {
      assert.deepEqual(parseCookieHeader('foo=bar'), { foo: 'bar' });
    });

    it('parses multiple cookies', () => {
      assert.deepEqual(parseCookieHeader('a=1; b=2; c=3'), { a: '1', b: '2', c: '3' });
    });

    it('preserves "=" inside values (base64 / JWT)', () => {
      assert.deepEqual(parseCookieHeader('jwt=eyJ.foo=bar'), {
        jwt: 'eyJ.foo=bar',
      });
    });

    it('handles cookies with surrounding whitespace', () => {
      assert.deepEqual(parseCookieHeader('  foo=bar  ;  baz=qux  '), {
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('handles empty value (`name=` with nothing after)', () => {
      assert.deepEqual(parseCookieHeader('empty='), { empty: '' });
    });

    it('skips entries with no name', () => {
      assert.deepEqual(parseCookieHeader('=value; foo=bar'), {
        foo: 'bar',
      });
    });

    it('ignores trailing semicolons / blank pieces', () => {
      assert.deepEqual(parseCookieHeader('a=1;; b=2;'), { a: '1', b: '2' });
    });
  });

  describe('getCookie', () => {
    it('returns null when no cookie header is present', () => {
      assert.equal(getCookie({ headers: { get: () => null } }, 'session'), null);
      assert.equal(getCookie({ headers: {} }, 'session'), null);
      assert.equal(getCookie({}, 'session'), null);
    });

    it('reads from Worker-style headers.get("Cookie")', () => {
      const request = {
        headers: { get: (name) => (name === 'Cookie' ? 'session=abc' : null) },
      };
      assert.equal(getCookie(request, 'session'), 'abc');
    });

    it('reads from Node-style headers.cookie', () => {
      const request = { headers: { cookie: 'session=abc; foo=bar' } };
      assert.equal(getCookie(request, 'foo'), 'bar');
    });

    it('returns null for an unknown cookie name', () => {
      const request = { headers: { cookie: 'session=abc' } };
      assert.equal(getCookie(request, 'missing'), null);
    });
  });

  describe('serializeCookie', () => {
    it('throws when name is empty / not a string', () => {
      assert.throws(() => serializeCookie('', 'v'), /non-empty string/);
      assert.throws(() => serializeCookie(123, 'v'), /non-empty string/);
      assert.throws(() => serializeCookie(null, 'v'), /non-empty string/);
    });

    it('applies safe defaults: Path=/, HttpOnly, Secure, SameSite=Strict', () => {
      const out = serializeCookie('session', 'tok');
      assert.match(out, /^session=tok;/);
      assert.match(out, /; Path=\/;/);
      assert.match(out, /; HttpOnly;/);
      assert.match(out, /; Secure;/);
      assert.match(out, /; SameSite=Strict$/);
    });

    it('encodes Max-Age', () => {
      const out = serializeCookie('s', 'v', { maxAge: 3600 });
      assert.match(out, /; Max-Age=3600;/);
    });

    it('encodes Expires from Date', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const out = serializeCookie('s', 'v', { expires: date });
      assert.match(out, /; Expires=Thu, 01 Jan 2026 00:00:00 GMT;/);
    });

    it('encodes Domain', () => {
      const out = serializeCookie('s', 'v', { domain: 'example.com' });
      assert.match(out, /; Domain=example\.com;/);
    });

    it('omits HttpOnly when explicitly disabled', () => {
      const out = serializeCookie('s', 'v', { httpOnly: false });
      assert.doesNotMatch(out, /HttpOnly/);
    });

    it('omits Secure when explicitly disabled', () => {
      const out = serializeCookie('s', 'v', { secure: false });
      assert.doesNotMatch(out, /Secure/);
    });

    it('respects custom SameSite', () => {
      assert.match(serializeCookie('s', 'v', { sameSite: 'Lax' }), /SameSite=Lax$/);
      assert.match(serializeCookie('s', 'v', { sameSite: 'None' }), /SameSite=None$/);
    });

    it('coerces non-string value safely (number, boolean, undefined, null)', () => {
      assert.match(serializeCookie('s', 42), /^s=42;/);
      assert.match(serializeCookie('s', true), /^s=true;/);
      assert.match(serializeCookie('s', undefined), /^s=;/);
      assert.match(serializeCookie('s', null), /^s=;/);
    });
  });

  describe('clearCookie', () => {
    it('produces a Max-Age=0 envelope', () => {
      const out = clearCookie('session');
      assert.match(out, /^session=;/);
      assert.match(out, /; Max-Age=0;/);
      assert.match(out, /; HttpOnly;/);
      assert.match(out, /; Secure;/);
      assert.match(out, /; SameSite=Strict$/);
    });

    it('passes through Domain / Path overrides', () => {
      const out = clearCookie('session', { domain: 'example.com', path: '/api' });
      assert.match(out, /; Domain=example\.com;/);
      assert.match(out, /; Path=\/api;/);
    });
  });
});
