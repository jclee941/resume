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

  test('logger exports the console transport and the package drops the ES surface', async () => {
    const mod = await import('@resume/shared/logger');
    const pkg = require('../../../packages/shared/package.json');

    expect(mod.createConsoleTransport).toBeDefined();
    expect(mod.createElasticsearchTransport).toBeUndefined();
    expect(pkg.exports['./es-client']).toBeUndefined();
    expect(pkg.exports['./logger/transports/elasticsearch']).toBeUndefined();
    await expect(import('@resume/shared/es-client')).rejects.toThrow();
  });
});
