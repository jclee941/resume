import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  AIService,
  CostTracker,
  MODEL_CATALOG,
  OpenAIProvider,
  PromptCache,
  WorkersAIProvider,
  createAIService,
} from '../index.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('ai index barrel exports', () => {
  it('exports all service symbols', () => {
    assert.ok(AIService);
    assert.ok(createAIService);
    assert.ok(WorkersAIProvider);
    assert.ok(OpenAIProvider);
    assert.ok(MODEL_CATALOG);
    assert.ok(PromptCache);
    assert.ok(CostTracker);
  });
});
