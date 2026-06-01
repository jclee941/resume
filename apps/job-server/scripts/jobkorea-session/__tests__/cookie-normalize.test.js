import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPlaywrightCookies } from '../cookie-utils.js';

test('fills missing domain and path so Playwright addCookies accepts the cookie', () => {
  const [cookie] = toPlaywrightCookies([{ name: 'SES_ID', value: 'abc' }]);
  assert.equal(cookie.name, 'SES_ID');
  assert.equal(cookie.value, 'abc');
  assert.equal(cookie.domain, '.jobkorea.co.kr');
  assert.equal(cookie.path, '/');
});

test('preserves an explicit domain/path already present on the cookie', () => {
  const [cookie] = toPlaywrightCookies([
    { name: 'X', value: '1', domain: 'www.jobkorea.co.kr', path: '/User' },
  ]);
  assert.equal(cookie.domain, 'www.jobkorea.co.kr');
  assert.equal(cookie.path, '/User');
});

test('normalises sameSite to a Playwright-accepted value', () => {
  const [bad] = toPlaywrightCookies([{ name: 'A', value: '1', sameSite: 'no_restriction' }]);
  assert.equal(bad.sameSite, 'Lax');
  const [good] = toPlaywrightCookies([{ name: 'B', value: '1', sameSite: 'None' }]);
  assert.equal(good.sameSite, 'None');
});

test('drops cookies missing a name or value rather than emitting invalid entries', () => {
  const result = toPlaywrightCookies([
    { name: 'ok', value: 'v' },
    { name: '', value: 'v' },
    { name: 'noval' },
    null,
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'ok');
});

test('returns an empty array for non-array input', () => {
  assert.deepEqual(toPlaywrightCookies(null), []);
  assert.deepEqual(toPlaywrightCookies(undefined), []);
});
