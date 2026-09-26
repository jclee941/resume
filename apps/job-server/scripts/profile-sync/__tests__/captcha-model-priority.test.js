import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVisionModels } from '../jobkorea-handler/captcha-solver.js';

test('defaults to the served cliproxy vision models', () => {
  assert.deepEqual(resolveVisionModels({}), ['gemini-3.1-flash-lite', 'gemini-3-flash']);
});

test('honours JOBKOREA_CAPTCHA_MODELS override (comma separated)', () => {
  const models = resolveVisionModels({ JOBKOREA_CAPTCHA_MODELS: 'gpt-5.5, gpt-5.4-mini ' });
  assert.deepEqual(models, ['gpt-5.5', 'gpt-5.4-mini']);
});

test('ignores empty override and falls back to defaults', () => {
  const models = resolveVisionModels({ JOBKOREA_CAPTCHA_MODELS: '   ' });
  assert.equal(models[0], 'gemini-3.1-flash-lite');
});
