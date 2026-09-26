import { HttpError, normalizeError } from '@resume/shared/errors';

/**
 * @typedef {Request & {
 *   params?: Record<string, string>;
 *   query?: Record<string, string>;
 * }} RouterRequest
 */

/**
 * @typedef {(request: RouterRequest) => Promise<Response> | Response} RouteHandler
 */

/**
 * @typedef {{
 *   method: string;
 *   pattern: string;
 *   regex: RegExp;
 *   handler: RouteHandler;
 * }} Route
 */

export class Router {
  constructor() {
    /** @type {Route[]} */
    this.routes = [];
  }

  /**
   * @param {string} method
   * @param {string} pattern
   * @param {RouteHandler} handler
   */
  add(method, pattern, handler) {
    const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`);
    this.routes.push({ method, pattern, regex, handler });
  }

  /**
   * @param {string} pattern
   * @param {RouteHandler} handler
   */
  get(pattern, handler) {
    this.add('GET', pattern, handler);
  }

  /**
   * @param {string} pattern
   * @param {RouteHandler} handler
   */
  post(pattern, handler) {
    this.add('POST', pattern, handler);
  }

  /**
   * @param {string} pattern
   * @param {RouteHandler} handler
   */
  put(pattern, handler) {
    this.add('PUT', pattern, handler);
  }

  /**
   * @param {string} pattern
   * @param {RouteHandler} handler
   */
  delete(pattern, handler) {
    this.add('DELETE', pattern, handler);
  }

  /**
   * Handle incoming request by matching against registered routes.
   * Wraps each handler in an error boundary that:
   * - Converts HttpError to structured HTTP responses
   * - Normalizes unknown errors and re-throws for top-level handling
   * @param {RouterRequest} request
   * @param {URL} url
   * @param {import('@resume/shared/logger').Logger} [logger]
   * @returns {Promise<Response|null>}
   */
  async handle(request, url, logger) {
    const method = request.method;
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.regex);
      if (match) {
        request.params = match.groups || {};
        request.query = Object.fromEntries(url.searchParams);

        try {
          return await route.handler(request);
        } catch (err) {
          const error = normalizeError(err, {
            route: route.pattern,
            method,
            pathname,
          });

          if (error instanceof HttpError) {
            if (logger) {
              logger.warn(`HTTP ${error.statusCode} on ${method} ${pathname}`, {
                errorCode: error.errorCode,
                statusCode: error.statusCode,
              });
            }
            return error.toResponse();
          }

          if (logger) {
            logger.error(`Unhandled error on ${method} ${pathname}`, error, {
              route: route.pattern,
            });
          }
          throw error;
        }
      }
    }

    return null;
  }
}
