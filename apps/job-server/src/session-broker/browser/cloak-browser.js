import { mkdirSync } from 'node:fs';

export const DEFAULT_CLOAK_BROWSER_ENDPOINT = 'http://localhost:8080';

export const DEFAULT_CLOAK_BROWSER_OPTIONS = Object.freeze({
  proxy: null,
  geoip: true,
  humanize: true,
  timezone: 'Asia/Seoul',
  locale: 'ko-KR',
  profileDir: null,
});

function normalizeCookies(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cookies)) return payload.cookies;
  return [];
}

function isUnsupportedEvaluate(error) {
  return /evaluate|unsupported|not implemented|404/i.test(error?.message || '');
}

export class CloakBrowser {
  constructor({
    endpoint = process.env.STEALTH_BROWSER_ENDPOINT || DEFAULT_CLOAK_BROWSER_ENDPOINT,
    fetchImpl = globalThis.fetch,
    ensureProfileDir = (dir) => mkdirSync(dir, { recursive: true }),
  } = {}) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
    this.ensureProfileDir = ensureProfileDir;
    this.browser = null;
    this.sessionId = null;
    this.options = null;
  }

  async launch(options = {}) {
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('CloakBrowser requires global fetch or an injected fetchImpl');
    }

    this.options = {
      ...DEFAULT_CLOAK_BROWSER_OPTIONS,
      ...options,
    };

    if (this.options.profileDir) {
      this.ensureProfileDir(this.options.profileDir);
    }

    const payload = await this.#request({
      action: 'launch',
      options: {
        ...this.options,
        stealth: true,
        persistentProfile: Boolean(this.options.profileDir),
      },
    });

    this.sessionId = payload.sessionId || 'default';
    this.browser = {
      backend: payload.backend || 'docker-stealthy-auto-browse',
      endpoint: this.endpoint,
      sessionId: this.sessionId,
      stealthEnabled: payload.stealthEnabled ?? true,
      profileDir: this.options.profileDir,
      goto: async (url) =>
        this.#request({
          action: 'goto',
          url,
          sessionId: this.sessionId,
        }),
      evaluate: async (expression) => this.#evaluate(expression),
      getCookies: async () => this.getCookies(),
      close: async () => this.close(),
    };

    return this.browser;
  }

  async getCookies() {
    if (!this.sessionId) {
      return [];
    }

    const payload = await this.#request({
      action: 'get_cookies',
      sessionId: this.sessionId,
    });

    return normalizeCookies(payload);
  }

  async close() {
    if (!this.sessionId) {
      return;
    }

    try {
      await this.#request({
        action: 'close',
        sessionId: this.sessionId,
      });
    } finally {
      this.browser = null;
      this.sessionId = null;
      this.options = null;
    }
  }

  async #evaluate(expression) {
    try {
      const payload = await this.#request({
        action: 'evaluate',
        expression,
        sessionId: this.sessionId,
      });

      return payload?.value;
    } catch (error) {
      if (expression === 'navigator.webdriver' && isUnsupportedEvaluate(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async #request(body) {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const message = payload?.error || `Stealth browser request failed: ${response.status}`;
      throw new Error(message);
    }

    if (payload?.error) {
      throw new Error(payload.error);
    }

    return payload;
  }
}

export function createCloakBrowser(options) {
  return new CloakBrowser(options);
}

export default CloakBrowser;
