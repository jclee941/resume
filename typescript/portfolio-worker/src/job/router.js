import { HttpError, normalizeError } from './lib/errors.js';

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    this.routes.push({ method, pattern, regex, handler });
  }

  get(pattern, handler) {
    this.add('GET', pattern, handler);
  }
  post(pattern, handler) {
    this.add('POST', pattern, handler);
  }
  put(pattern, handler) {
    this.add('PUT', pattern, handler);
  }
  delete(pattern, handler) {
    this.add('DELETE', pattern, handler);
  }

  /**
   * Route the request, wrapping each handler in an error boundary.
   * @param {Request} request
   * @param {URL} url
   * @param {import('../../../job-automation/src/shared/logger/index.js').default} [logger]
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
          const normalized = normalizeError(err, { route: route.pattern, method });
          if (normalized instanceof HttpError) {
            logger?.warn(`Route error: ${normalized.message}`, {
              route: route.pattern,
              statusCode: normalized.statusCode,
            });
            return normalized.toResponse();
          }
          logger?.error(normalized, { route: route.pattern });
          throw normalized;
        }
      }
    }

    return null;
  }
}
