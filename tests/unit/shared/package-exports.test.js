/**
 * Verify @resume/shared package exports resolve correctly.
 * Each subpath entry in packages/shared/package.json#exports must:
 *  1. Be importable via the package name.
 *  2. Export the expected symbols.
 */

describe('@resume/shared package exports', () => {
  test('./errors exports error classes and normalizeError', async () => {
    const mod = await import('@resume/shared/errors');

    expect(mod.AppError).toBeDefined();
    expect(mod.HttpError).toBeDefined();
    expect(mod.normalizeError).toBeDefined();
    expect(mod.ValidationError).toBeDefined();
    expect(mod.NotFoundError).toBeDefined();
    expect(mod.UnauthorizedError).toBeDefined();
    expect(mod.ForbiddenError).toBeDefined();
    expect(mod.BadRequestError).toBeDefined();
    expect(mod.RateLimitError).toBeDefined();
    expect(mod.AuthError).toBeDefined();
    expect(mod.CrawlerError).toBeDefined();
    expect(mod.ExternalServiceError).toBeDefined();
  });

  test('./logger exports Logger class and utilities', async () => {
    const mod = await import('@resume/shared/logger');

    expect(mod.default).toBeDefined(); // default export = Logger
    expect(mod.Logger).toBeDefined();
    expect(mod.RequestContext).toBeDefined();
    expect(mod.LogLevel).toBeDefined();
    expect(mod.generateRequestId).toBeDefined();
  });

  test('./es-client exports elasticsearch logging functions', async () => {
    const mod = await import('@resume/shared/es-client');

    expect(mod.logToElasticsearch).toBeDefined();
    expect(mod.flush).toBeDefined();
    expect(mod.logEvent).toBeDefined();
    expect(mod.logError).toBeDefined();
  });
});
