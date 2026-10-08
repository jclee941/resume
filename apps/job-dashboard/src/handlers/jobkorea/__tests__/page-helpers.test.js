import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isLoggedIn } from '../page-helpers.js';

const saved = { document: globalThis.document, location: globalThis.location };

function pageWithoutLoginLinksAt(pathname) {
  return {
    evaluate: async (fn) => {
      Object.assign(globalThis, {
        document: { querySelector: () => null },
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
    assert.equal(await isLoggedIn(pageWithoutLoginLinksAt('/user/mypage')), true);
  });

  it('stays logged out on the login page', async () => {
    assert.equal(await isLoggedIn(pageWithoutLoginLinksAt('/Login/Login_Tot.asp')), false);
  });
});
