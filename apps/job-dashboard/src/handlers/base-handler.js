/**
 * Base handler class with shared utilities for all domain handlers.
 * Provides common functionality like JSON responses and access to env/auth.
 */
export class BaseHandler {
  constructor(env, auth) {
    this.env = env;
    this.auth = auth;
  }

  /**
   * Create a JSON response with proper headers
   * @param {Object} data - Response data
   * @param {number} status - HTTP status code
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
