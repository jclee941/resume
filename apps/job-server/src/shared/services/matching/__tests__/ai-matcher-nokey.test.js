// ai-matcher-nokey.test.js
// Runs in separate node --test child process with NO API key.
// c8 aggregates coverage from this process with ai-matcher.test.js.

import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

// Ensure no API key before module load — CLAUDE_CONFIG.apiKey = undefined
delete process.env.CLAUDE_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

// Direct import (no cache buster) so c8 can track coverage
const ai = await import('../ai-matcher.js');

describe('ai-matcher (no API key)', { concurrency: 1 }, () => {
  const logger = { warn: mock.fn(), error: mock.fn() };

  afterEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
    logger.warn.mock.resetCalls();
    logger.error.mock.resetCalls();
  });

  it('analyzeWithClaude returns null and warns when no API key', async () => {
    const result = await ai.analyzeWithClaude('prompt', 'text', { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.warn.mock.calls.length, 1);
  });

  it('analyzeJobPosting returns null (exercises || content branch)', async () => {
    // description undefined → jobPosting.description || jobPosting.content branch
    const result = await ai.analyzeJobPosting({ content: 'content-val' }, { logger });
    assert.strictEqual(result, null);
  });

  it('analyzeResume returns null (exercises || empty-string branches)', async () => {
    // All fields missing → || '' fallback on line 82-83
    const result = await ai.analyzeResume({}, { logger });
    assert.strictEqual(result, null);
  });

  it('extractKeywordsWithAI returns fallback object', async () => {
    const result = await ai.extractKeywordsWithAI('text', 'general', { logger });
    assert.deepEqual(result, { keywords: [], tech_stack: [], importance_scores: {} });
  });

  it('calculateAIMatch returns fallback with zero score', async () => {
    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', () => '총 경력: 8년 0개월\nDevOps');
    syncBuiltinESMExports();

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.fallback, true);
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.reasoning, 'AI 분석 실패');
  });

  it('matchJobsWithAI returns error when resume analysis fails', async () => {
    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', () => '총 경력: 8년 0개월\nDevOps');
    syncBuiltinESMExports();

    const result = await ai.matchJobsWithAI(
      '/tmp/resume.md',
      [{ position: 'A', description: 'desc' }],
      { logger }
    );
    assert.strictEqual(result.success, false);
    assert.match(result.error, /Resume analysis failed/);
    assert.strictEqual(result.resumeAnalysis, null);
  });

  it('getCareerAdvice returns null and getAICareerAdvice is alias', async () => {
    const result = await ai.getCareerAdvice({ s: 1 }, { j: 1 }, { m: 1 }, { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(ai.getAICareerAdvice, ai.getCareerAdvice);
  });
});
