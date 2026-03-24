describe('Error Hierarchy Contract Tests', () => {
  let errors;

  beforeAll(async () => {
    // Mock Response if not present (Node environment)
    if (typeof global.Response === 'undefined') {
      global.Response = class {
        constructor(body, init = {}) {
          this.body = body;
          this.status = init.status || 200;
          this.headers = new Map(Object.entries(init.headers || {}));
        }
        async json() {
          return JSON.parse(this.body);
        }
      };
    }

    // Dynamic import for ESM module
    errors = await import('@resume/shared/errors');
  });

  test('should export exactly 12 members', () => {
    const exports = Object.keys(errors).filter((k) => k !== '__esModule');
    expect(exports.length).toBe(12);
  });

  test('all required exports should exist', () => {
    const required = [
      'AppError',
      'HttpError',
      'BadRequestError',
      'UnauthorizedError',
      'ForbiddenError',
      'NotFoundError',
      'RateLimitError',
      'CrawlerError',
      'AuthError',
      'ValidationError',
      'ExternalServiceError',
      'normalizeError',
    ];
    required.forEach((name) => {
      expect(errors[name]).toBeDefined();
    });
  });

  describe('AppError', () => {
    test('inheritance', () => {
      const { AppError } = errors;
      const err = new AppError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AppError');
    });

    test('constructor defaults', () => {
      const { AppError } = errors;
      const err = new AppError('test message');
      expect(err.message).toBe('test message');
      expect(err.errorCode).toBe('INTERNAL_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err.context).toEqual({});
      expect(err.timestamp).toBeDefined();
    });

    test('toJSON', () => {
      const { AppError } = errors;
      const err = new AppError('msg', { context: { a: 1 } });
      const json = err.toJSON();
      expect(json).toMatchObject({
        name: 'AppError',
        message: 'msg',
        errorCode: 'INTERNAL_ERROR',
        isOperational: true,
        context: { a: 1 },
      });
      expect(json.timestamp).toBe(err.timestamp);
      expect(json.stack).toBeDefined();
    });

    test('toJSON serializes nested AppError cause via cause.toJSON()', () => {
      const { AppError } = errors;
      const rootCause = new AppError('root fail', { errorCode: 'ROOT_FAIL' });
      const err = new AppError('wrapper', { cause: rootCause });
      const json = err.toJSON();

      expect(json.cause).toBeDefined();
      expect(json.cause.name).toBe('AppError');
      expect(json.cause.message).toBe('root fail');
      expect(json.cause.errorCode).toBe('ROOT_FAIL');
    });

    test('toJSON serializes native Error cause using message/name', () => {
      const { AppError } = errors;
      const err = new AppError('wrapper', { cause: new TypeError('bad type') });
      const json = err.toJSON();

      expect(json.cause).toEqual({ message: 'bad type', name: 'TypeError' });
    });

    test('toJSON omits cause when no cause is provided', () => {
      const { AppError } = errors;
      const err = new AppError('no cause');
      const json = err.toJSON();

      expect(json.cause).toBeUndefined();
    });
  });

  describe('HttpError', () => {
    test('inheritance', () => {
      const { HttpError, AppError } = errors;
      const err = new HttpError(500, 'msg');
      expect(err).toBeInstanceOf(AppError);
    });

    test('toResponse', async () => {
      const { HttpError } = errors;
      const err = new HttpError(400, 'Bad Request', { context: { details: 'some details' } });
      const res = err.toResponse({ 'X-Custom': 'Value' });

      expect(res.status).toBe(400);

      // Use standard Headers API if available, otherwise check our mock's Map
      if (typeof res.headers.get === 'function') {
        expect(res.headers.get('Content-Type')).toContain('application/json');
        expect(res.headers.get('X-Custom')).toBe('Value');
      }

      const body = await res.json();
      expect(body).toEqual({
        error: 'Bad Request',
        errorCode: 'HTTP_400',
        details: 'some details',
      });
    });

    test('toResponse omits details when context.details is absent', async () => {
      const { HttpError } = errors;
      const err = new HttpError(401, 'Unauthorized');
      const res = err.toResponse();
      const body = await res.json();

      expect(body).toEqual({
        error: 'Unauthorized',
        errorCode: 'HTTP_401',
      });
      expect(body.details).toBeUndefined();
    });
  });

  describe('Convenience HTTP Subclasses', () => {
    test.each([
      ['BadRequestError', 400, 'BAD_REQUEST', 'Bad Request'],
      ['UnauthorizedError', 401, 'UNAUTHORIZED', 'Unauthorized'],
      ['ForbiddenError', 403, 'FORBIDDEN', 'Forbidden'],
      ['NotFoundError', 404, 'NOT_FOUND', 'Not Found'],
      ['RateLimitError', 429, 'RATE_LIMITED', 'Too Many Requests'],
    ])('%s should have status %p and code %p', (name, status, code, defaultMsg) => {
      const Cls = errors[name];
      const { HttpError } = errors;
      const err = new Cls();
      expect(err).toBeInstanceOf(HttpError);
      expect(err.statusCode).toBe(status);
      expect(err.errorCode).toBe(code);
      expect(err.message).toBe(defaultMsg);
    });
  });

  describe('Specialized Errors', () => {
    test('CrawlerError', () => {
      const { CrawlerError, AppError } = errors;
      const err = new CrawlerError('failed', { platform: 'wanted', step: 'login' });
      expect(err).toBeInstanceOf(AppError);
      expect(err.platform).toBe('wanted');
      expect(err.step).toBe('login');
      const json = err.toJSON();
      expect(json.platform).toBe('wanted');
      expect(json.step).toBe('login');
    });

    test('CrawlerError uses explicit errorCode and defaults unknown platform/step', () => {
      const { CrawlerError } = errors;
      const err = new CrawlerError('failed', { errorCode: 'CUSTOM_CRAWLER_CODE' });

      expect(err.errorCode).toBe('CUSTOM_CRAWLER_CODE');
      expect(err.platform).toBe('unknown');
      expect(err.step).toBe('unknown');
    });

    test('CrawlerError defaults to CRAWLER_ERROR when errorCode is omitted', () => {
      const { CrawlerError } = errors;
      const err = new CrawlerError('failed');

      expect(err.errorCode).toBe('CRAWLER_ERROR');
    });

    test('AuthError', () => {
      const { AuthError, AppError } = errors;
      const err = new AuthError('failed', { provider: 'google' });
      expect(err).toBeInstanceOf(AppError);
      expect(err.provider).toBe('google');
      expect(err.toJSON().provider).toBe('google');
    });

    test('AuthError defaults provider to unknown', () => {
      const { AuthError } = errors;
      const err = new AuthError('failed');

      expect(err.provider).toBe('unknown');
    });

    test('ValidationError', () => {
      const { ValidationError, AppError } = errors;
      const errs = [{ field: 'email', message: 'invalid' }];
      const err = new ValidationError('failed', { errors: errs });
      expect(err).toBeInstanceOf(AppError);
      expect(err.errors).toBe(errs);
      expect(err.toJSON().errors).toEqual(errs);
    });

    test('ExternalServiceError', () => {
      const { ExternalServiceError, AppError } = errors;
      const err = new ExternalServiceError('failed', { service: 'slack', statusCode: 502 });
      expect(err).toBeInstanceOf(AppError);
      expect(err.service).toBe('slack');
      expect(err.serviceStatusCode).toBe(502);
      expect(err.toJSON().service).toBe('slack');
      expect(err.toJSON().serviceStatusCode).toBe(502);
    });

    test('ExternalServiceError uses defaults for errorCode and service', () => {
      const { ExternalServiceError } = errors;
      const err = new ExternalServiceError('failed');

      expect(err.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(err.service).toBe('unknown');
    });
  });

  describe('normalizeError', () => {
    test('should return same instance if already AppError', () => {
      const { normalizeError, ValidationError } = errors;
      const err = new ValidationError('msg');
      const normalized = normalizeError(err, { extra: 'ctx' });
      expect(normalized).toBe(err);
      expect(normalized.context.extra).toBe('ctx');
    });

    test('should merge context into existing AppError when context is non-empty', () => {
      const { normalizeError, AppError } = errors;
      const err = new AppError('msg', { context: { existing: 'value' } });
      const normalized = normalizeError(err, { incoming: 'ctx' });

      expect(normalized).toBe(err);
      expect(normalized.context).toEqual({ existing: 'value', incoming: 'ctx' });
    });

    test('should wrap Error instance', () => {
      const { normalizeError, AppError } = errors;
      const original = new Error('native error');
      const normalized = normalizeError(original, { foo: 'bar' });
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.errorCode).toBe('UNHANDLED_ERROR');
      expect(normalized.isOperational).toBe(false);
      expect(normalized.cause).toBe(original);
    });

    test('should wrap string', () => {
      const { normalizeError, AppError } = errors;
      const normalized = normalizeError('just a string');
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('just a string');
    });

    test('should handle null/undefined', () => {
      const { normalizeError } = errors;
      expect(normalizeError(null).message).toBe('Unknown error');
      expect(normalizeError(undefined).message).toBe('Unknown error');
    });

    test('should handle objects', () => {
      const { normalizeError } = errors;
      const normalized = normalizeError({ some: 'obj' });
      expect(normalized.message).toBe('Unknown error');
      expect(normalized.context.rawError).toBe('[object Object]');
    });
  });
});
