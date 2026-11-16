import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isLoggedIn } from '../page-helpers.js';

const saved = { document: globalThis.document, location: globalThis.location };

function pageAt(pathname, { matches = [], text = '' } = {}) {
  return {
    evaluate: async (fn) => {
      Object.assign(globalThis, {
        document: {
          querySelector: (selector) => (matches.some((m) => selector.includes(m)) ? {} : null),
          body: { innerText: text },
        },
        location: { pathname },
      });
      return fn();
    },
  };
}

describe('isLoggedIn', () => {
  afterEach(() => {
    Object.assign(globalThis, saved);
  });

  it('treats landing on the lowercase /user/mypage after login as logged in', async () => {
    assert.equal(await isLoggedIn(pageAt('/user/mypage')), true);
  });

  it('treats a logout link as logged in on any page', async () => {
    assert.equal(await isLoggedIn(pageAt('/', { matches: ['/Login/Logout'] })), true);
  });

  it('stays logged out on the login page', async () => {
    assert.equal(await isLoggedIn(pageAt('/Login/Login_Tot.asp')), false);
  });

  it('stays logged out on a My Page that asks to log in first', async () => {
    const prompt = pageAt('/user/mypage', { text: '개인회원 로그인 후 이용해 주세요' });
    assert.equal(await isLoggedIn(prompt), false);
    const loginForm = pageAt('/user/mypage', { matches: ['input[type="password"]'] });
    assert.equal(await isLoggedIn(loginForm), false);
  });
});
