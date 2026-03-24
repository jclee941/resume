import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { MODEL_CATALOG, OpenAIProvider, WorkersAIProvider } from '../providers.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('WorkersAIProvider', () => {
  it('throws without AI binding', () => {
    assert.throws(() => new WorkersAIProvider(), /Workers AI binding/);
    assert.throws(() => new WorkersAIProvider({}), /Workers AI binding/);
  });

  it('completes responses across all result shapes and estimates usage', async () => {
    let callIndex = 0;
    const run = mock.fn(async (_model, _params) => {
      callIndex += 1;
      const n = callIndex;
      if (n === 1) return 'plain-text';
      if (n === 2) return { response: 'from-response' };
      if (n === 3) return { result: 'from-result' };
      return { other: 'fallback-json' };
    });
    const provider = new WorkersAIProvider({ AI: { run } });

    const first = await provider.complete('model-a', {
      messages: [{ role: 'user', content: 'hello world' }],
    });
    const second = await provider.complete('model-b', {
      messages: [{ role: 'user', content: '' }],
      max_tokens: 100,
      temperature: 0.2,
    });
    const third = await provider.complete('model-c', {
      messages: [{ role: 'user', content: 'abc' }],
    });
    const fourth = await provider.complete('model-d', {
      messages: [{ role: 'user', content: 'xyz' }],
    });

    assert.equal(provider.name, 'workers-ai');
    assert.equal(first.text, 'plain-text');
    assert.equal(second.text, 'from-response');
    assert.equal(third.text, 'from-result');
    assert.equal(fourth.text, JSON.stringify({ other: 'fallback-json' }));
    assert.equal(first.provider, 'workers-ai');
    assert.equal(first.model, 'model-a');
    assert.ok(typeof first.latencyMs === 'number');
    assert.equal(first.usage.prompt_tokens, 3);
    assert.equal(first.usage.completion_tokens, 3);
    assert.equal(first.usage.total_tokens, 0);
    assert.equal(second.usage.prompt_tokens, 0);
    assert.deepEqual(run.mock.calls[1].arguments[1], {
      messages: [{ role: 'user', content: '' }],
      max_tokens: 100,
      temperature: 0.2,
    });
  });

  it('embeds single and multiple inputs', async () => {
    let callIndex = 0;
    const run = mock.fn(async () => {
      callIndex += 1;
      const n = callIndex;
      if (n === 1) return { data: [[0.1, 0.2]] };
      return [[0.3, 0.4]];
    });
    const provider = new WorkersAIProvider({ AI: { run } });

    const one = await provider.embed('embed-model', 'text-a');
    const many = await provider.embed('embed-model', ['text-a', 'text-b']);

    assert.deepEqual(one.embeddings, [[0.1, 0.2]]);
    assert.deepEqual(many.embeddings, [[0.3, 0.4]]);
    assert.equal(one.provider, 'workers-ai');
    assert.deepEqual(run.mock.calls[0].arguments[1], { text: ['text-a'] });
    assert.deepEqual(run.mock.calls[1].arguments[1], { text: ['text-a', 'text-b'] });
  });
});

describe('OpenAIProvider', () => {
  it('throws when apiKey or gatewayUrl is missing and trims trailing slash', () => {
    assert.throws(() => new OpenAIProvider({ gatewayUrl: 'https://gw' }), /API key is required/);
    assert.throws(() => new OpenAIProvider({ apiKey: 'k' }), /Gateway URL is required/);

    const provider = new OpenAIProvider({ apiKey: 'k', gatewayUrl: 'https://gw/' });
    assert.equal(provider.gatewayUrl, 'https://gw');
    assert.equal(provider.name, 'openai');
  });

  it('completes successfully with explicit and fallback fields', async () => {
    let callIndex = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async () => {
      callIndex += 1;
      const n = callIndex;
      if (n === 1) {
        return {
          ok: true,
          json: async () => ({
            model: 'gpt-returned',
            choices: [{ message: { content: 'hello' } }],
            usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [],
        }),
      };
    });

    const provider = new OpenAIProvider({
      apiKey: 'token',
      gatewayUrl: 'https://gw',
      timeoutMs: 5,
    });

    const first = await provider.complete('gpt-4o-mini', {
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 55,
      temperature: 0.2,
    });
    const second = await provider.complete('gpt-4o-mini', {
      messages: [{ role: 'user', content: 'hello again' }],
    });

    assert.equal(first.text, 'hello');
    assert.equal(first.model, 'gpt-returned');
    assert.equal(first.provider, 'openai');
    assert.deepEqual(first.usage, { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 });
    assert.ok(typeof first.latencyMs === 'number');
    assert.equal(second.text, '');
    assert.equal(second.model, 'gpt-4o-mini');
    assert.deepEqual(second.usage, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    assert.match(fetchMock.mock.calls[0].arguments[0], /https:\/\/gw\/chat\/completions$/);
    assert.equal(fetchMock.mock.calls[0].arguments[1].method, 'POST');
  });

  it('throws on completion error responses including unknown text body path', async () => {
    let callIndex = 0;
    const _fetchMock = mock.method(globalThis, 'fetch', async () => {
      callIndex += 1;
      const n = callIndex;
      if (n === 1) {
        return {
          ok: false,
          status: 401,
          text: async () => 'unauthorized',
        };
      }
      return {
        ok: false,
        status: 500,
        text: async () => {
          throw new Error('cannot-read');
        },
      };
    });
    const provider = new OpenAIProvider({ apiKey: 'token', gatewayUrl: 'https://gw' });

    await assert.rejects(
      provider.complete('gpt-4o-mini', { messages: [{ role: 'user', content: 'x' }] }),
      /OpenAI API error 401: unauthorized/
    );
    await assert.rejects(
      provider.complete('gpt-4o-mini', { messages: [{ role: 'user', content: 'x' }] }),
      /OpenAI API error 500: unknown/
    );
  });

  it('embeds successfully and throws on embedding errors', async () => {
    let callIndex = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async () => {
      callIndex += 1;
      const n = callIndex;
      if (n === 1) {
        return {
          ok: true,
          json: async () => ({
            model: 'embedding-model',
            data: [{ embedding: [0.1, 0.2] }],
          }),
        };
      }
      if (n === 2) {
        return {
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.3] }, { embedding: [0.4] }],
          }),
        };
      }
      return {
        ok: false,
        status: 429,
      };
    });
    const provider = new OpenAIProvider({ apiKey: 'token', gatewayUrl: 'https://gw' });

    const single = await provider.embed('text-embedding-3-small', 'hello');
    const multi = await provider.embed('text-embedding-3-small', ['a', 'b']);

    assert.deepEqual(single.embeddings, [[0.1, 0.2]]);
    assert.equal(single.model, 'embedding-model');
    assert.equal(single.provider, 'openai');
    assert.deepEqual(multi.embeddings, [[0.3], [0.4]]);
    assert.equal(multi.model, 'text-embedding-3-small');
    assert.match(fetchMock.mock.calls[0].arguments[0], /https:\/\/gw\/embeddings$/);

    await assert.rejects(
      provider.embed('text-embedding-3-small', 'x'),
      /OpenAI embedding error 429/
    );
  });
});

describe('MODEL_CATALOG', () => {
  it('contains five expected entries with provider, model, tier, and costPer1kTokens', () => {
    const keys = Object.keys(MODEL_CATALOG).sort();
    assert.deepEqual(keys, [
      'openai-embed',
      'openai-fast',
      'openai-quality',
      'workers-embed',
      'workers-fast',
    ]);

    for (const key of keys) {
      const entry = MODEL_CATALOG[key];
      assert.ok(entry.provider === 'workers-ai' || entry.provider === 'openai');
      assert.equal(typeof entry.model, 'string');
      assert.equal(typeof entry.tier, 'string');
      assert.equal(typeof entry.costPer1kTokens, 'number');
    }
  });
});
