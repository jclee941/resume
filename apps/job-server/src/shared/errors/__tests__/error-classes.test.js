import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../app-error.js';
import {
  AuthenticationError,
  CrawlerError,
  ExternalServiceError,
  PlatformError,
  RateLimitError,
  ValidationError,
} from '../domain-errors.js';
import { ErrorCodes } from '../error-codes.js';

describe('ErrorCodes', () => {
  it('contains expected unique ERR_* string codes', () => {
    const entries = Object.entries(ErrorCodes);
    const values = Object.values(ErrorCodes);
    const expectedKeys = [
      'UNKNOWN',
      'VALIDATION',
      'NOT_FOUND',
      'TIMEOUT',
      'AUTH_REQUIRED',
      'AUTH_EXPIRED',
      'AUTH_INVALID',
      'RATE_LIMITED',
      'RATE_LIMIT_PLATFORM',
      'CRAWLER_FETCH_FAILED',
      'CRAWLER_PARSE_FAILED',
      'CRAWLER_BLOCKED',
      'CRAWLER_CAPTCHA',
      'CRAWLER_RETRY_EXHAUSTED',
      'PLATFORM_UNAVAILABLE',
      'PLATFORM_AUTH_FAILED',
      'PLATFORM_API_ERROR',
      'PLATFORM_APPLY_FAILED',
      'EXTERNAL_API_ERROR',
      'EXTERNAL_TIMEOUT',
      'EXTERNAL_UNAVAILABLE',
      'APPLICATION_DUPLICATE',
      'APPLICATION_INVALID',
    ];

    assert.deepEqual(Object.keys(ErrorCodes).sort(), expectedKeys.sort());
    assert.equal(entries.length, expectedKeys.length);
    for (const value of values) {
      assert.equal(typeof value, 'string');
      assert.match(value, /^ERR_/);
    }

    assert.equal(new Set(values).size, values.length);
  });
});

describe('AppError', () => {
  it('sets constructor properties and inherits Error', () => {
    const cause = new Error('root cause');
    const metadata = { field: 'value' };
    const error = new AppError('boom', ErrorCodes.VALIDATION, 400, metadata, cause);

    assert.equal(error.message, 'boom');
    assert.equal(error.code, ErrorCodes.VALIDATION);
    assert.equal(error.statusCode, 400);
    assert.deepEqual(error.metadata, metadata);
    assert.equal(error.cause, cause);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof AppError);
    assert.equal(error.name, 'AppError');
  });

  it('applies default values', () => {
    const error = new AppError('default');

    assert.equal(error.code, ErrorCodes.UNKNOWN);
    assert.equal(error.statusCode, 500);
    assert.deepEqual(error.metadata, {});
    assert.equal(error.cause, null);
  });

  it('defaults invalid metadata to empty object', () => {
    const error = new AppError('invalid metadata', ErrorCodes.UNKNOWN, 500, 'nope');
    assert.deepEqual(error.metadata, {});
  });

  it('toJSON returns all fields and serializes Error cause', () => {
    const cause = new TypeError('invalid type');
    const error = new AppError('failed', ErrorCodes.EXTERNAL_API_ERROR, 502, { a: 1 }, cause);

    assert.deepEqual(error.toJSON(), {
      name: 'AppError',
      message: 'failed',
      code: ErrorCodes.EXTERNAL_API_ERROR,
      statusCode: 502,
      metadata: { a: 1 },
      cause: {
        name: 'TypeError',
        message: 'invalid type',
      },
    });
  });

  it('toJSON excludes cause when null', () => {
    const error = new AppError('ok');
    const json = error.toJSON();

    assert.equal(Object.prototype.hasOwnProperty.call(json, 'cause'), false);
    assert.deepEqual(json, {
      name: 'AppError',
      message: 'ok',
      code: ErrorCodes.UNKNOWN,
      statusCode: 500,
      metadata: {},
    });
  });

  it('fromError returns same AppError instance', () => {
    const error = new AppError('already app error', ErrorCodes.TIMEOUT, 408);
    const wrapped = AppError.fromError(error, ErrorCodes.UNKNOWN, 500);

    assert.equal(wrapped, error);
  });

  it('fromError wraps plain Error with code, statusCode, metadata and cause', () => {
    const original = new SyntaxError('bad syntax');
    const wrapped = AppError.fromError(original, ErrorCodes.NOT_FOUND, 404);

    assert.ok(wrapped instanceof AppError);
    assert.equal(wrapped.message, 'bad syntax');
    assert.equal(wrapped.code, ErrorCodes.NOT_FOUND);
    assert.equal(wrapped.statusCode, 404);
    assert.deepEqual(wrapped.metadata, { name: 'SyntaxError' });
    assert.equal(wrapped.cause, original);
  });

  it('fromError handles non-Error values', () => {
    const stringWrapped = AppError.fromError('string failure');
    const nullWrapped = AppError.fromError(null);
    const undefinedWrapped = AppError.fromError(undefined);

    assert.equal(stringWrapped.message, 'Unknown error');
    assert.equal(stringWrapped.code, ErrorCodes.UNKNOWN);
    assert.equal(stringWrapped.statusCode, 500);
    assert.deepEqual(stringWrapped.metadata, { value: 'string failure' });
    assert.equal(stringWrapped.cause, null);

    assert.equal(nullWrapped.message, 'Unknown error');
    assert.deepEqual(nullWrapped.metadata, { value: null });

    assert.equal(undefinedWrapped.message, 'Unknown error');
    assert.deepEqual(undefinedWrapped.metadata, { value: undefined });
  });
});

describe('Domain errors', () => {
  it('ValidationError defaults and custom fields', () => {
    const base = new ValidationError();
    assert.equal(base.message, 'Validation failed');
    assert.equal(base.code, ErrorCodes.VALIDATION);
    assert.equal(base.statusCode, 400);
    assert.deepEqual(base.metadata.fields, []);

    const custom = new ValidationError('invalid payload', {
      fields: ['email', 'profile.name'],
      metadata: { source: 'api' },
    });
    assert.equal(custom.message, 'invalid payload');
    assert.deepEqual(custom.metadata, {
      source: 'api',
      fields: ['email', 'profile.name'],
    });
    assert.ok(custom instanceof ValidationError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'ValidationError');
  });

  it('AuthenticationError defaults and platform field', () => {
    const base = new AuthenticationError();
    assert.equal(base.message, 'Authentication required');
    assert.equal(base.code, ErrorCodes.AUTH_REQUIRED);
    assert.equal(base.statusCode, 401);

    const custom = new AuthenticationError('auth failed', {
      platform: 'wanted',
      metadata: { hint: 'token expired' },
    });
    assert.deepEqual(custom.metadata, { hint: 'token expired', platform: 'wanted' });
    assert.ok(custom instanceof AuthenticationError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'AuthenticationError');
  });

  it('RateLimitError defaults and retryAfterMs/platform fields', () => {
    const base = new RateLimitError();
    assert.equal(base.message, 'Rate limit exceeded');
    assert.equal(base.code, ErrorCodes.RATE_LIMITED);
    assert.equal(base.statusCode, 429);

    const custom = new RateLimitError('too many requests', {
      retryAfterMs: 2500,
      platform: 'wanted',
      metadata: { bucket: 'search' },
    });
    assert.deepEqual(custom.metadata, {
      bucket: 'search',
      retryAfterMs: 2500,
      platform: 'wanted',
    });
    assert.ok(custom instanceof RateLimitError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'RateLimitError');
  });

  it('CrawlerError defaults and platform/url/attempt fields', () => {
    const base = new CrawlerError();
    assert.equal(base.message, 'Crawler request failed');
    assert.equal(base.code, ErrorCodes.CRAWLER_FETCH_FAILED);
    assert.equal(base.statusCode, 502);

    const custom = new CrawlerError('crawl failed', {
      platform: 'wanted',
      url: 'https://wanted.co.kr/jobs/1',
      attempt: 2,
      metadata: { phase: 'fetch' },
    });
    assert.deepEqual(custom.metadata, {
      phase: 'fetch',
      platform: 'wanted',
      url: 'https://wanted.co.kr/jobs/1',
      attempt: 2,
    });
    assert.ok(custom instanceof CrawlerError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'CrawlerError');
  });

  it('PlatformError defaults and platform/originalStatus fields', () => {
    const base = new PlatformError();
    assert.equal(base.message, 'Platform API error');
    assert.equal(base.code, ErrorCodes.PLATFORM_API_ERROR);
    assert.equal(base.statusCode, 502);

    const custom = new PlatformError('platform exploded', {
      platform: 'wanted',
      originalStatus: 503,
      metadata: { requestId: 'abc' },
    });
    assert.deepEqual(custom.metadata, {
      requestId: 'abc',
      platform: 'wanted',
      originalStatus: 503,
    });
    assert.ok(custom instanceof PlatformError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'PlatformError');
  });

  it('ExternalServiceError defaults and service/originalStatus fields', () => {
    const base = new ExternalServiceError();
    assert.equal(base.message, 'External service API error');
    assert.equal(base.code, ErrorCodes.EXTERNAL_API_ERROR);
    assert.equal(base.statusCode, 502);

    const custom = new ExternalServiceError('upstream down', {
      service: 'slack',
      originalStatus: 504,
      metadata: { region: 'ap-northeast-2' },
    });
    assert.deepEqual(custom.metadata, {
      region: 'ap-northeast-2',
      service: 'slack',
      originalStatus: 504,
    });
    assert.ok(custom instanceof ExternalServiceError);
    assert.ok(custom instanceof AppError);
    assert.ok(custom instanceof Error);
    assert.equal(custom.name, 'ExternalServiceError');
  });

  it('all six subclasses support custom code/statusCode overrides', () => {
    const customCode = ErrorCodes.APPLICATION_INVALID;
    const customStatus = 422;

    const cases = [
      new ValidationError('v', { code: customCode, statusCode: customStatus }),
      new AuthenticationError('a', { code: customCode, statusCode: customStatus }),
      new RateLimitError('r', { code: customCode, statusCode: customStatus }),
      new CrawlerError('c', { code: customCode, statusCode: customStatus }),
      new PlatformError('p', { code: customCode, statusCode: customStatus }),
      new ExternalServiceError('e', { code: customCode, statusCode: customStatus }),
    ];

    for (const error of cases) {
      assert.equal(error.code, customCode);
      assert.equal(error.statusCode, customStatus);
      assert.ok(error instanceof AppError);
      assert.ok(error instanceof Error);
    }
  });
});
