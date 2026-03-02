export class WantedAPIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'WantedAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

const BASE_URL = 'https://www.wanted.co.kr/api/v4';
const SNS_API_URL = 'https://www.wanted.co.kr/api/sns/v1';
const SNS_PROFILE_URL = 'https://www.wanted.co.kr/sns-api'; // Profile-specific SNS API
const CHAOS_API_URL = 'https://www.wanted.co.kr/api/chaos';

export class HttpClient {
  #cookies;
  #defaultHeaders;

  constructor(cookies = null) {
    this.#cookies = cookies;
    this.#defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Origin: 'https://www.wanted.co.kr',
      Referer: 'https://www.wanted.co.kr/',
    };
  }

  setCookies(cookies) {
    this.#cookies = cookies;
  }

  getCookies() {
    return this.#cookies;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  async snsRequest(endpoint, options = {}) {
    const url = `${SNS_API_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  async chaosRequest(endpoint, options = {}) {
    const url = `${CHAOS_API_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

  async snsProfileRequest(endpoint, options = {}) {
    const url = `${SNS_PROFILE_URL}${endpoint}`;
    return this.#fetch(url, options);
  }

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
      throw new WantedAPIError(
        `API request failed: ${response.status}`,
        response.status,
        text,
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
}

export default HttpClient;
