/**
 * GitLab HTTP Client with OAuth2 authentication
 * Uses client_credentials flow for machine-to-machine authentication
 */

export class GitLabAPIError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [response] - Response body text
   */
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'GitLabAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * @typedef {Object} OAuthConfig
 * @property {string} baseUrl - GitLab instance URL (e.g., 'http://gitlab.jclee.me')
 * @property {string} appId - OAuth application ID
 * @property {string} clientSecret - OAuth client secret
 * @property {string} [scope] - OAuth scopes (default: 'api read_api read_repository')
 */

/**
 * GitLab HTTP Client with OAuth2 token management
 */
export class GitLabHttpClient {
  /** @type {string} */
  #baseUrl;
  /** @type {string} */
  #appId;
  /** @type {string} */
  #clientSecret;
  /** @type {string} */
  #accessToken;
  /** @type {number} */
  #tokenExpiresAt;
  /** @type {string} */
  #scope;

  /**
   * @param {OAuthConfig} config
   */
  constructor(config) {
    this.#baseUrl = config.baseUrl?.replace(/\/$/, '') || process.env.GITLAB_URL || 'http://gitlab.jclee.me';
    this.#appId = config.appId || process.env.GITLAB_OAUTH_APP_ID;
    this.#clientSecret = config.clientSecret || process.env.GITLAB_OAUTH_CLIENT_SECRET;
    this.#scope = config.scope || 'api read_api read_repository';
    this.#accessToken = null;
    this.#tokenExpiresAt = 0;
  }

  /**
   * Check if token needs refresh (expired or will expire within 60 seconds)
   * @returns {boolean}
   */
  #needsTokenRefresh() {
    if (!this.#accessToken) return true;
    return Date.now() >= (this.#tokenExpiresAt - 60000);
  }

  /**
   * Fetch OAuth access token using client_credentials flow
   * @returns {Promise<string>} Access token
   */
  async fetchAccessToken() {
    if (this.#accessToken && !this.#needsTokenRefresh()) {
      return this.#accessToken;
    }

    const tokenUrl = `${this.#baseUrl}/oauth/token`;
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.#appId,
      client_secret: this.#clientSecret,
      scope: this.#scope,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new GitLabAPIError(
        `OAuth token fetch failed: ${response.status}`,
        response.status,
        text
      );
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new GitLabAPIError('No access_token in OAuth response', response.status);
    }

    this.#accessToken = data.access_token;
    // Default expiry is 7200 seconds (2 hours), use provided value or default
    const expiresIn = data.expires_in || 7200;
    this.#tokenExpiresAt = Date.now() + (expiresIn * 1000);

    return this.#accessToken;
  }

  /**
   * Get current access token (fetches if not available)
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    if (!this.#accessToken || this.#needsTokenRefresh()) {
      return this.fetchAccessToken();
    }
    return this.#accessToken;
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint (e.g., '/projects')
   * @param {Object} [options] - Request options
   * @param {string} [options.method='GET'] - HTTP method
   * @param {Object} [options.body] - Request body
   * @param {Object} [options.query] - Query parameters
   * @param {Object} [options.headers] - Additional headers
   * @returns {Promise<Object>} Response JSON
   */
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    let url = `${this.#baseUrl}/api/v4${endpoint}`;
    
    // Add query parameters if provided
    if (options.query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const fetchOptions = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle 401 by attempting token refresh once
    if (response.status === 401) {
      this.#accessToken = null;
      this.#tokenExpiresAt = 0;
      const newToken = await this.fetchAccessToken();
      
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, fetchOptions);
      
      if (!retryResponse.ok) {
        const text = await retryResponse.text().catch(() => '');
        throw new GitLabAPIError(
          `GitLab API error after token refresh: ${retryResponse.status}`,
          retryResponse.status,
          text
        );
      }

      const contentType = retryResponse.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return retryResponse.json();
      }
      return retryResponse.text();
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new GitLabAPIError(
        `GitLab API error: ${response.status}`,
        response.status,
        text
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  /**
   * Set access token directly (for testing or manual token)
   * @param {string} token - Access token
   * @param {number} [expiresIn=7200] - Seconds until expiry
   */
  setAccessToken(token, expiresIn = 7200) {
    this.#accessToken = token;
    this.#tokenExpiresAt = Date.now() + (expiresIn * 1000);
  }
}

export default GitLabHttpClient;
