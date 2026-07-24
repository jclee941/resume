import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { logToElasticsearch } from '../index.js';

describe('elasticsearch client best-effort logging', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('emits a typed warning and still resolves when immediate logging fails', async () => {
    mock.method(console, 'warn', () => {});
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('network down');
    });

    const env = {
      ELASTICSEARCH_URL: 'https://es.example.test',
      ELASTICSEARCH_API_KEY: 'secret',
    };

    await assert.doesNotReject(() =>
      logToElasticsearch(env, 'best effort message', 'INFO', {}, { immediate: true })
    );

    assert.equal(console.warn.mock.calls.length, 1);
    assert.equal(console.warn.mock.calls[0].arguments[0], '[ES] Immediate log failed:');
    assert.equal(console.warn.mock.calls[0].arguments[1].name, 'AppError');
    assert.equal(console.warn.mock.calls[0].arguments[1].errorCode, 'UNHANDLED_ERROR');
    assert.equal(console.warn.mock.calls[0].arguments[1].isOperational, false);
    assert.equal(console.warn.mock.calls[0].arguments[1].context.client, 'elasticsearch');
    assert.equal(console.warn.mock.calls[0].arguments[1].context.operation, 'logToElasticsearch');
  });
});
