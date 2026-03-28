import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import errorHandler from '../../middleware/error-handler.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

function createReplyMock() {
  const state = {
    headers: {},
    statusCode: null,
    payload: null,
  };

  const reply = {
    header: (name, value) => {
      state.headers[name] = value;
      return reply;
    },
    status: (code) => {
      state.statusCode = code;
      return {
        send: (payload) => {
          state.payload = payload;
          return payload;
        },
      };
    },
  };

  return { reply, state };
}

describe('errorHandler middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    if (typeof originalNodeEnv === 'string') {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('handles AppError with its status/code and adds correlation id', () => {
    let logged;
    const request = {
      url: '/test',
      method: 'GET',
      log: {
        error: (value) => {
          logged = value;
        },
      },
    };
    const { reply, state } = createReplyMock();

    const error = new AppError('bad request', ErrorCodes.VALIDATION, 400, { fields: ['name'] });
    errorHandler(error, request, reply);

    assert.equal(state.statusCode, 400);
    assert.equal(state.payload.code, ErrorCodes.VALIDATION);
    assert.equal(state.payload.message, 'bad request');
    assert.equal(typeof state.payload.correlationId, 'string');
    assert.match(
      state.payload.correlationId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    assert.equal(state.headers['X-Correlation-ID'], state.payload.correlationId);

    assert.equal(logged.url, '/test');
    assert.equal(logged.method, 'GET');
    assert.equal(logged.errorCode, ErrorCodes.VALIDATION);
    assert.equal(logged.correlationId, state.payload.correlationId);
    assert.equal(logged.err, error);
  });

  it('handles plain Error as ERR_UNKNOWN with 500 status', () => {
    let logged;
    const request = {
      url: '/test',
      method: 'GET',
      log: {
        error: (value) => {
          logged = value;
        },
      },
    };
    const { reply, state } = createReplyMock();

    const error = new Error('unexpected crash');
    errorHandler(error, request, reply);

    assert.equal(state.statusCode, 500);
    assert.equal(state.payload.code, ErrorCodes.UNKNOWN);
    assert.equal(state.payload.message, 'unexpected crash');
    assert.equal(typeof state.headers['X-Correlation-ID'], 'string');
    assert.equal(state.payload.correlationId, state.headers['X-Correlation-ID']);

    assert.equal(logged.errorCode, ErrorCodes.UNKNOWN);
    assert.equal(logged.url, '/test');
    assert.equal(logged.method, 'GET');
  });

  it('maps WantedAPIError-shaped input to status 502', () => {
    let logged;
    const request = {
      url: '/test',
      method: 'GET',
      log: {
        error: (value) => {
          logged = value;
        },
      },
    };
    const { reply, state } = createReplyMock();

    const wantedError = {
      name: 'WantedAPIError',
      message: 'platform unavailable',
      statusCode: 503,
      response: { message: 'maintenance' },
    };

    errorHandler(wantedError, request, reply);

    assert.equal(state.statusCode, 502);
    assert.equal(state.payload.code, ErrorCodes.PLATFORM_API_ERROR);
    assert.equal(state.payload.message, 'platform unavailable');
    assert.equal(typeof state.headers['X-Correlation-ID'], 'string');
    assert.equal(state.payload.correlationId, state.headers['X-Correlation-ID']);
    assert.equal(logged.errorCode, ErrorCodes.PLATFORM_API_ERROR);
  });
});
