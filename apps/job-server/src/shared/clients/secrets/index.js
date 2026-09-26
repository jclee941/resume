const DEFAULT_BASE_URL = 'https://infisical.jclee.me/api/v3';
const CACHE_TTL_MS = 5 * 60 * 1000;

export class SecretsClient {
  /**
   * @param {string} [token]
   * @param {string} [environment]
   * @param {string} [projectID]
   * @param {string|null} [baseURL]
   * @param {{ warn(msg: string, ...args: unknown[]): void }|null} [logger]
   */
  constructor(token, environment, projectID, baseURL = null, logger = null) {
    this.token = token;
    this.environment = environment;
    this.projectID = projectID;
    this.baseURL = baseURL || process.env.INFISICAL_API_URL || DEFAULT_BASE_URL;
    this.cache = new Map();
    this.logger = logger ?? console;
  }

  /**
   * @param {{ warn(msg: string, ...args: unknown[]): void }|null} [logger]
   * @returns {SecretsClient|FallbackSecretsClient}
   */
  static fromEnv(logger = null) {
    const log = logger ?? console;
    const token = process.env.INFISICAL_TOKEN;
    if (!token) {
      return new FallbackSecretsClient();
    }

    const environment = process.env.INFISICAL_ENVIRONMENT || 'prod';
    const projectID = process.env.INFISICAL_PROJECT_ID;
    if (!projectID) {
      log.warn('[SecretsClient] INFISICAL_PROJECT_ID not set, using env fallback');
      return new FallbackSecretsClient();
    }

    return new SecretsClient(token, environment, projectID, null, logger);
  }

  /**
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    try {
      const secrets = await this.fetchSecrets();
      for (const s of secrets) {
        this.cache.set(s.secretKey, {
          value: s.secretValue,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      const result = this.cache.get(key);
      if (result) {
        return result.value;
      }
    } catch (err) {
      this.logger.warn(
        `[SecretsClient] Infisical fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return this.fallbackToEnv(key);
  }

  /**
   * @returns {Promise<Array<{ secretKey: string; secretValue: string }>>}
   */
  async fetchSecrets() {
    const url = `${this.baseURL}/secrets?environment=${this.environment}&workspaceId=${this.projectID}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Infisical API error: ${resp.status} ${body}`);
    }

    const data = /** @type {{ secrets?: Array<{ secretKey: string; secretValue: string }> }} */ (
      await resp.json()
    );
    return data.secrets || [];
  }

  /**
   * @param {string} key
   * @returns {string|null}
   */
  fallbackToEnv(key) {
    const value = process.env[key];
    if (value) {
      return value;
    }
    return null;
  }

  /**
   * @param {string} key
   * @returns {Promise<string>}
   */
  async mustGet(key) {
    const value = await this.get(key);
    if (!value) {
      throw new Error(`Required secret "${key}" not found`);
    }
    return value;
  }

  /**
   * @param {string} key
   * @param {string} defaultVal
   * @returns {Promise<string>}
   */
  async getWithDefault(key, defaultVal) {
    const value = await this.get(key);
    return value || defaultVal;
  }

  async getPlatformCredentials() {
    return {
      linkedin: {
        email: await this.get('LINKEDIN_EMAIL'),
        password: await this.get('LINKEDIN_PASSWORD'),
        cookies: await this.get('LINKEDIN_COOKIES'),
      },
      saramin: {
        email: await this.get('SARAMIN_EMAIL'),
        password: await this.get('SARAMIN_PASSWORD'),
        cookies: await this.get('SARAMIN_COOKIES'),
      },
      jobkorea: {
        email: await this.get('JOBKOREA_EMAIL'),
        password: await this.get('JOBKOREA_PASSWORD'),
        cookies: await this.get('JOBKOREA_COOKIES'),
      },
      wanted: {
        sessionCookie: await this.get('WANTED_SESSION_COOKIE'),
      },
    };
  }
}

class FallbackSecretsClient {
  /**
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    return process.env[key] || null;
  }

  /**
   * @param {string} key
   * @returns {Promise<string>}
   */
  async mustGet(key) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required env var "${key}" not found`);
    }
    return value;
  }

  /**
   * @param {string} key
   * @param {string} defaultVal
   * @returns {Promise<string>}
   */
  async getWithDefault(key, defaultVal) {
    return process.env[key] || defaultVal;
  }

  async getPlatformCredentials() {
    return {
      linkedin: {
        email: process.env.LINKEDIN_EMAIL,
        password: process.env.LINKEDIN_PASSWORD,
        cookies: process.env.LINKEDIN_COOKIES,
      },
      saramin: {
        email: process.env.SARAMIN_EMAIL,
        password: process.env.SARAMIN_PASSWORD,
        cookies: process.env.SARAMIN_COOKIES,
      },
      jobkorea: {
        email: process.env.JOBKOREA_EMAIL,
        password: process.env.JOBKOREA_PASSWORD,
        cookies: process.env.JOBKOREA_COOKIES,
      },
      wanted: {
        sessionCookie: process.env.WANTED_SESSION_COOKIE,
      },
    };
  }
}
