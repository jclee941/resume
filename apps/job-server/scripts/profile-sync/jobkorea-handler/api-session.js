export function createAPISession(cookieString = '') {
  return {
    cookieString,
    getCookieHeader() {
      return this.cookieString;
    },
  };
}
