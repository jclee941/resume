import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVisionModels } from '../jobkorea-handler/captcha-solver.js';

test('defaults to a GPT vision model first', () => {
  const models = resolveVisionModels({});
  assert.ok(models.length > 0);
  assert.match(models[0], /^gpt-/, `expected first model to be a GPT model, got ${models[0]}`);
});

test('honours JOBKOREA_CAPTCHA_MODELS override (comma separated)', () => {
  const models = resolveVisionModels({ JOBKOREA_CAPTCHA_MODELS: 'gpt-5.5, gpt-5.4-mini ' });
  assert.deepEqual(models, ['gpt-5.5', 'gpt-5.4-mini']);
});

test('ignores empty override and falls back to defaults', () => {
  const models = resolveVisionModels({ JOBKOREA_CAPTCHA_MODELS: '   ' });
  assert.match(models[0], /^gpt-/);
});
