import { cookieArrayToString } from '@resume/shared/session';

/**
 * @typedef {Object} SessionCookieItem
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef {Object} SessionData
 * @property {string} [cookieString]
 * @property {string | SessionCookieItem[]} [cookies]
 * @property {string} [token]
 * @property {string} [platform]
 */

/**
 * @typedef {Object} SessionManagerLike
 * @property {(platform: string) => SessionData | null} load
 * @property {(session: SessionData) => Promise<unknown>} createAuthenticatedApi
 */

/**
 * @param {SessionData} session
 * @returns {string | undefined}
 */
function getSessionCookieString(session) {
  return (
    session.cookieString ||
    (Array.isArray(session.cookies) ? cookieArrayToString(session.cookies) : session.cookies) ||
    session.token
  );
}

/**
 * @param {SessionData} session
 * @returns {Promise<import('@resume/shared/clients/wanted').WantedAPI>}
 */
export async function createAuthenticatedWantedApi(session) {
  const WantedAPI = (await import('@resume/shared/clients/wanted')).default;
  const api = new WantedAPI();
  const cookieStr = getSessionCookieString(session);

  if (cookieStr) {
    api.setCookies(cookieStr);
  }

  return api;
}

export const sessionCookieMethods = {
  /**
   * @this {SessionManagerLike}
   * @param {string} [platform]
   * @returns {Promise<unknown>}
   */
  async getAPI(platform = 'wanted') {
    const session = this.load(platform);
    if (!session) return null;

    if (!session.cookies && !session.cookieString && !session.token) return null;

    return this.createAuthenticatedApi(session);
  },
};
