const path = require('path');
const { pathToFileURL } = require('url');

async function loadRenewSession() {
  const scriptPath = path.resolve(
    __dirname,
    '../../../apps/job-server/scripts/renew-wanted-session.js'
  );
  return import(pathToFileURL(scriptPath).href);
}

describe('renew-wanted-session', () => {
  test('matches current and previous Wanted email login labels', async () => {
    const { isWantedEmailLoginText } = await loadRenewSession();

    expect(isWantedEmailLoginText('이메일로 시작하기')).toBe(true);
    expect(isWantedEmailLoginText('이메일로 계속하기')).toBe(true);
  });

  test('rejects non-email social login labels', async () => {
    const { isWantedEmailLoginText } = await loadRenewSession();

    expect(isWantedEmailLoginText('Kakao 계정으로 계속하기')).toBe(false);
    expect(isWantedEmailLoginText('기존 계정 찾기')).toBe(false);
  });

  test('finds the current Wanted email login button through the browser selector', async () => {
    const { findWantedEmailLoginButton, WANTED_EMAIL_LOGIN_MATCHER } = await loadRenewSession();
    const emailButton = { textContent: '이메일로 시작하기' };
    const previousDocument = global.document;
    global.document = {
      querySelectorAll: jest.fn(() => [{ textContent: 'Kakao 계정으로 계속하기' }, emailButton]),
    };

    try {
      expect(findWantedEmailLoginButton(WANTED_EMAIL_LOGIN_MATCHER)).toBe(emailButton);
    } finally {
      global.document = previousDocument;
    }
  });
});
