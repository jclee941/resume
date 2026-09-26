export class WantedAPIError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {unknown} [response]
   */
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'WantedAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

const BASE_URL = 'https://www.wanted.co.kr/api/v4';
const SNS_API_URL = 'https://www.wanted.co.kr/api/sns/v1';
const LEGACY_SNS_API_URL = 'https://www.wanted.co.kr/api/sns-api';
const SNS_PROFILE_URL = 'https://www.wanted.co.kr/sns-api'; // Profile-specific SNS API
const CHAOS_API_URL = 'https://www.wanted.co.kr/api/chaos';

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 * @property {unknown} [body]
 */

export class HttpClient {
  /** @type {string | null} */
  #cookies;
  /** @type {Record<string, string>} */
  #defaultHeaders;

  /**
   * @param {string | null} [cookies]
   */
  constructor(cookies = null) {
    this.#cookies = cookies;
    this.#defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Referer: 'https://www.wanted.co.kr/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Origin: 'https://www.wanted.co.kr',
    };
  }

  /**
   * @param {string | null} cookies
   */
  setCookies(cookies) {
    this.#cookies = cookies;
  }

  /**
   * @returns {string | null}
   */
  getCookies() {
    return this.#cookies;
  }

  /**
   * @param {string} endpoint
   * @param {RequestOptions} [options]
   */
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  /**
   * @param {string} endpoint
   * @param {RequestOptions} [options]
   */
  async snsRequest(endpoint, options = {}) {
    const url = `${SNS_API_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  /**
   * @param {string} endpoint
   * @param {RequestOptions} [options]
   */
  async legacySnsRequest(endpoint, options = {}) {
    const url = `${LEGACY_SNS_API_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  /**
   * @param {string} endpoint
   * @param {RequestOptions} [options]
   */
  async chaosRequest(endpoint, options = {}) {
    const url = `${CHAOS_API_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  /**
   * @param {string} endpoint
   * @param {RequestOptions} [options]
   */
  async snsProfileRequest(endpoint, options = {}) {
    const url = `${SNS_PROFILE_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  /**
   * @param {string} url
   * @param {RequestOptions} [options]
   */
  async #fetch(url, options = {}) {
    const headers = { ...this.#defaultHeaders, ...options.headers };

    if (this.#cookies) {
      headers.Cookie = this.#cookies;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new WantedAPIError(`API request failed: ${response.status}`, response.status, text);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
}

export default HttpClient;
