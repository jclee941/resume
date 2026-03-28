import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../app-error.js';
import { ErrorCodes } from '../error-codes.js';
import { formatErrorResponse } from '../error-formatter.js';

describe('formatErrorResponse', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    if (typeof originalNodeEnv === 'string') {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('formats AppError with standard shape and details when metadata is non-empty', () => {
    const error = new AppError('bad payload', ErrorCodes.VALIDATION, 400, { fields: ['email'] });
    const result = formatErrorResponse(error);

    assert.deepEqual(result, {
      error: {
        code: ErrorCodes.VALIDATION,
        message: 'bad payload',
        statusCode: 400,
        details: { fields: ['email'] },
      },
    });
  });

  it('excludes details when AppError metadata is empty', () => {
    const error = new AppError('boom', ErrorCodes.UNKNOWN, 500, {});
    const result = formatErrorResponse(error);

    assert.equal(Object.prototype.hasOwnProperty.call(result.error, 'details'), false);
    assert.deepEqual(result, {
      error: {
        code: ErrorCodes.UNKNOWN,
        message: 'boom',
        statusCode: 500,
      },
    });
  });

  it('includes stack only in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new AppError('explode', ErrorCodes.UNKNOWN, 500, {});

    const result = formatErrorResponse(error);
    assert.equal(typeof result.error.stack, 'string');
    assert.match(result.error.stack, /AppError: explode/);
  });

  it('excludes stack in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new AppError('explode', ErrorCodes.UNKNOWN, 500, {});

    const result = formatErrorResponse(error);
    assert.equal(Object.prototype.hasOwnProperty.call(result.error, 'stack'), false);
  });

  it('maps WantedAPIError-shaped input to PlatformError response', () => {
    const wantedError = {
      name: 'WantedAPIError',
      message: 'wanted failed',
      statusCode: 503,
      response: { reason: 'maintenance' },
    };

    const result = formatErrorResponse(wantedError);

    assert.equal(result.error.code, ErrorCodes.PLATFORM_API_ERROR);
    assert.equal(result.error.statusCode, 502);
    assert.equal(result.error.message, 'wanted failed');
    assert.deepEqual(result.error.details.platform, 'wanted');
    assert.deepEqual(result.error.details.originalStatus, 503);
    assert.deepEqual(result.error.details.response, { reason: 'maintenance' });
  });

  it('maps Fastify validation error to ValidationError response with extracted fields', () => {
    const validationError = {
      message: 'request body invalid',
      validationContext: 'body',
      validation: [
        {
          instancePath: '/job/id',
          params: { missingProperty: 'title' },
        },
        {
          instancePath: '/job/company/name',
          params: {},
        },
      ],
    };

    const result = formatErrorResponse(validationError);

    assert.equal(result.error.code, ErrorCodes.VALIDATION);
    assert.equal(result.error.statusCode, 400);
    assert.equal(result.error.message, 'request body invalid');
    assert.ok(Array.isArray(result.error.details.fields));
    assert.deepEqual(
      result.error.details.fields.sort(),
      ['job.company.name', 'job.id', 'title'].sort()
    );
    assert.deepEqual(result.error.details.validationContext, 'body');
    assert.equal(result.error.details.validation.length, 2);
  });

  it('maps plain Error with statusCode=404 to ERR_NOT_FOUND', () => {
    const error = new Error('missing resource');
    error.statusCode = 404;

    const result = formatErrorResponse(error);
    assert.equal(result.error.code, ErrorCodes.NOT_FOUND);
    assert.equal(result.error.statusCode, 404);
    assert.equal(result.error.message, 'missing resource');
  });

  it('maps plain Error with statusCode=408 to ERR_TIMEOUT', () => {
    const error = new Error('request timeout');
    error.statusCode = 408;

    const result = formatErrorResponse(error);
    assert.equal(result.error.code, ErrorCodes.TIMEOUT);
    assert.equal(result.error.statusCode, 408);
    assert.equal(result.error.message, 'request timeout');
  });

  it('maps plain Error with statusCode=429 to ERR_RATE_LIMITED', () => {
    const error = new Error('rate limited');
    error.statusCode = 429;

    const result = formatErrorResponse(error);
    assert.equal(result.error.code, ErrorCodes.RATE_LIMITED);
    assert.equal(result.error.statusCode, 429);
    assert.equal(result.error.message, 'rate limited');
  });

  it('maps plain Error with other status to ERR_UNKNOWN', () => {
    const error = new Error('conflict-like');
    error.statusCode = 409;

    const result = formatErrorResponse(error);
    assert.equal(result.error.code, ErrorCodes.UNKNOWN);
    assert.equal(result.error.statusCode, 409);
    assert.equal(result.error.message, 'conflict-like');
  });

  it('maps non-error inputs to ERR_UNKNOWN with statusCode 500', () => {
    const nullResult = formatErrorResponse(null);
    const undefinedResult = formatErrorResponse(undefined);
    const stringResult = formatErrorResponse('bad');

    for (const result of [nullResult, undefinedResult, stringResult]) {
      assert.equal(result.error.code, ErrorCodes.UNKNOWN);
      assert.equal(result.error.statusCode, 500);
      assert.equal(result.error.message, 'Internal Server Error');
    }
  });
});
