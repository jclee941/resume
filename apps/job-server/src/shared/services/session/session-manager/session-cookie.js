import { cookieArrayToString } from '@resume/shared/session';

export function getSessionCookieString(session) {
  return (
    session.cookieString ||
    (Array.isArray(session.cookies) ? cookieArrayToString(session.cookies) : session.cookies) ||
    session.token
  );
}

export async function createAuthenticatedWantedApi(session) {
  const WantedAPI = (await import('../../../clients/wanted/index.js')).default;
  const api = new WantedAPI();
  const cookieStr = getSessionCookieString(session);

  if (cookieStr) {
    api.setCookies(cookieStr);
  }

  return api;
}

export const sessionCookieMethods = {
  async getAPI(platform = 'wanted') {
    const session = this.load(platform);
    if (!session) return null;

    if (!session.cookies && !session.cookieString && !session.token) return null;

    return createAuthenticatedWantedApi(session);
  },
};
