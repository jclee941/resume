/**
 * @fileoverview Cookie/session persistence across requests.
 *
 * Manages cookies with domain/path matching, expiry handling,
 * and import/export for persistence.
 *
 * @module shared/services/stealth/cookie-jar
 */

/**
 * @typedef {object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {string} domain
 * @property {string} [path]
 * @property {number} [expires] - Timestamp in ms
 * @property {boolean} [httpOnly]
 * @property {boolean} [secure]
 * @property {string} [sameSite]
 */

/**
 * In-memory cookie jar with domain/path matching and expiry.
 */
export class CookieJar {
  constructor() {
    /** @type {Map<string, Cookie>} key = "domain|path|name" */
    this._cookies = new Map();
  }

  /**
   * Add or update a cookie.
   * @param {Cookie} cookie
   */
  setCookie(cookie) {
    if (!cookie.name || !cookie.domain) return;

    const normalized = {
      ...cookie,
      domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`,
      path: cookie.path || '/',
    };

    const key = this._key(normalized.domain, normalized.path, normalized.name);
    this._cookies.set(key, normalized);
  }

  /**
   * Parse Set-Cookie header string(s) and store cookies.
   * @param {string|string[]} setCookieHeader - Raw Set-Cookie header value(s)
   * @param {string} requestUrl - The URL that returned this header
   */
  setCookiesFromHeader(setCookieHeader, requestUrl) {
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    let hostname;
    try {
      hostname = new URL(requestUrl).hostname;
    } catch {
      return;
    }

    for (const header of headers) {
      if (!header) continue;
      const cookie = this._parseSetCookie(header, hostname);
      if (cookie) {
        this.setCookie(cookie);
      }
    }
  }

  /**
   * Get cookies applicable to a URL (domain + path matching).
   * Automatically clears expired cookies encountered.
   * @param {string} url
   * @returns {Cookie[]}
   */
  getCookies(url) {
    let hostname, pathname;
    try {
      const parsed = new URL(url);
      hostname = parsed.hostname;
      pathname = parsed.pathname;
    } catch {
      return [];
    }

    const now = Date.now();
    const matching = [];

    for (const [key, cookie] of this._cookies) {
      // Check expiry
      if (cookie.expires && cookie.expires < now) {
        this._cookies.delete(key);
        continue;
      }

      // Domain match: .example.com matches example.com and sub.example.com
      if (!this._domainMatches(cookie.domain, hostname)) continue;

      // Path match: /foo matches /foo, /foo/bar, etc.
      if (!pathname.startsWith(cookie.path)) continue;

      matching.push(cookie);
    }

    return matching;
  }

  /**
   * Get formatted Cookie header string for a URL.
   * @param {string} url
   * @returns {string} "name=value; name2=value2" or empty string
   */
  getCookieHeader(url) {
    const cookies = this.getCookies(url);
    if (cookies.length === 0) return '';
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  /**
   * Remove a specific cookie.
   * @param {string} name
   * @param {string} domain
   */
  removeCookie(name, domain) {
    const normalizedDomain = domain.startsWith('.') ? domain : `.${domain}`;
    // Remove all paths for this name+domain
    for (const [key] of this._cookies) {
      if (key.endsWith(`|${name}`) && key.startsWith(`${normalizedDomain}|`)) {
        this._cookies.delete(key);
      }
    }
  }

  /**
   * Clear all cookies for a domain.
   * @param {string} domain
   */
  clearDomain(domain) {
    const normalizedDomain = domain.startsWith('.') ? domain : `.${domain}`;
    for (const [key] of this._cookies) {
      if (key.startsWith(`${normalizedDomain}|`)) {
        this._cookies.delete(key);
      }
    }
  }

  /**
   * Remove expired cookies.
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, cookie] of this._cookies) {
      if (cookie.expires && cookie.expires < now) {
        this._cookies.delete(key);
      }
    }
  }

  /**
   * Remove all cookies.
   */
  clearAll() {
    this._cookies.clear();
  }

  /**
   * Export all cookies for persistence.
   * @returns {Cookie[]}
   */
  exportCookies() {
    return [...this._cookies.values()];
  }

  /**
   * Import cookies from saved state.
   * @param {Cookie[]} cookies
   */
  importCookies(cookies) {
    for (const cookie of cookies) {
      this.setCookie(cookie);
    }
  }

  /** @returns {number} Total cookie count */
  get size() {
    return this._cookies.size;
  }

  /**
   * Generate storage key for a cookie.
   * @param {string} domain
   * @param {string} path
   * @param {string} name
   * @returns {string}
   * @private
   */
  _key(domain, path, name) {
    return `${domain}|${path}|${name}`;
  }

  /**
   * Check if cookie domain matches request hostname.
   * @param {string} cookieDomain - e.g. ".example.com"
   * @param {string} hostname - e.g. "www.example.com"
   * @returns {boolean}
   * @private
   */
  _domainMatches(cookieDomain, hostname) {
    const normalizedCookie = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
    return hostname === normalizedCookie || hostname.endsWith(`.${normalizedCookie}`);
  }

  /**
   * Parse a Set-Cookie header string into a Cookie object.
   * @param {string} header
   * @param {string} fallbackDomain
   * @returns {Cookie|null}
   * @private
   */
  _parseSetCookie(header, fallbackDomain) {
    const parts = header.split(';').map((p) => p.trim());
    const [nameValue, ...attrs] = parts;

    if (!nameValue) return null;
    const eqIndex = nameValue.indexOf('=');
    if (eqIndex === -1) return null;

    const name = nameValue.slice(0, eqIndex).trim();
    const value = nameValue.slice(eqIndex + 1).trim();

    if (!name) return null;

    /** @type {Cookie} */
    const cookie = {
      name,
      value,
      domain: fallbackDomain,
      path: '/',
    };

    for (const attr of attrs) {
      const [attrName, ...attrValueParts] = attr.split('=');
      const attrKey = attrName.trim().toLowerCase();
      const attrVal = attrValueParts.join('=').trim();

      switch (attrKey) {
        case 'domain':
          if (attrVal) cookie.domain = attrVal;
          break;
        case 'path':
          if (attrVal) cookie.path = attrVal;
          break;
        case 'expires': {
          const parsed = Date.parse(attrVal);
          if (!Number.isNaN(parsed)) cookie.expires = parsed;
          break;
        }
        case 'max-age': {
          const seconds = parseInt(attrVal, 10);
          if (!Number.isNaN(seconds)) cookie.expires = Date.now() + seconds * 1000;
          break;
        }
        case 'httponly':
          cookie.httpOnly = true;
          break;
        case 'secure':
          cookie.secure = true;
          break;
        case 'samesite':
          cookie.sameSite = attrVal;
          break;
      }
    }

    return cookie;
  }
}
