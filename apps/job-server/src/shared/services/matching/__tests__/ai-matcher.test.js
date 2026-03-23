// Separate child process from ai-matcher-nokey.test.js — API key IS set here.
// c8 aggregates coverage across both processes.

import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

process.env.CLAUDE_API_KEY = 'test-key';

const ai = await import('../ai-matcher.js');

function claudeResponse(text) {
  return new Response(JSON.stringify({ content: [{ text }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockLoadResume() {
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFileSync', () => '총 경력: 8년 0개월\nDevOps Security');
  syncBuiltinESMExports();
}

describe('ai-matcher (with API key)', { concurrency: 1 }, () => {
  const logger = { warn: mock.fn(), error: mock.fn() };

  afterEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
    logger.warn.mock.resetCalls();
    logger.error.mock.resetCalls();
  });

  it('returns text on success', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{"ok":true}'));
    const result = await ai.analyzeWithClaude('prompt', 'text');
    assert.strictEqual(result, '{"ok":true}');
  });

  it('returns null on non-ok response', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('fail', { status: 500 }));
    const result = await ai.analyzeWithClaude('prompt', 'text', { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('returns null on fetch exception', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('network');
    });
    const result = await ai.analyzeWithClaude('prompt', 'text', { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('analyzeJobPosting extracts JSON from response', async () => {
    mock.method(globalThis, 'fetch', async () =>
      claudeResponse('prefix {"required_skills":["js"],"experience_level":"mid"} suffix')
    );
    const result = await ai.analyzeJobPosting({ description: 'desc' }, { logger });
    assert.deepEqual(result, { required_skills: ['js'], experience_level: 'mid' });
  });

  it('analyzeJobPosting uses content field when description is falsy', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{"required_skills":["py"]}'));
    const result = await ai.analyzeJobPosting({ content: 'job content' }, { logger });
    assert.deepEqual(result, { required_skills: ['py'] });
  });

  it('analyzeJobPosting returns null when no JSON found', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('plain text'));
    const result = await ai.analyzeJobPosting({ description: 'desc' }, { logger });
    assert.strictEqual(result, null);
  });

  it('analyzeJobPosting returns null on JSON parse error', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{invalid-json}'));
    const result = await ai.analyzeJobPosting({ description: 'desc' }, { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('analyzeJobPosting returns null when claude fails', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('err', { status: 500 }));
    const result = await ai.analyzeJobPosting({ description: 'desc' }, { logger });
    assert.strictEqual(result, null);
  });

  it('analyzeResume extracts JSON from response', async () => {
    mock.method(globalThis, 'fetch', async () =>
      claudeResponse('x {"skills":["devops"],"experience_years":8} y')
    );
    const result = await ai.analyzeResume(
      { summary: 'sum', experience: 'exp', skills: 'sk' },
      { logger }
    );
    assert.deepEqual(result, { skills: ['devops'], experience_years: 8 });
  });

  it('analyzeResume handles missing fields via || fallback', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{"skills":["k8s"]}'));
    const result = await ai.analyzeResume({}, { logger });
    assert.deepEqual(result, { skills: ['k8s'] });
  });

  it('analyzeResume returns null when no JSON match', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('no json'));
    const result = await ai.analyzeResume({ summary: 's' }, { logger });
    assert.strictEqual(result, null);
  });

  it('analyzeResume returns null on parse error', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{invalid-json}'));
    const result = await ai.analyzeResume({ summary: 's' }, { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('calculateAIMatch returns full AI analysis on success', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"],"experience_level":"senior"}'),
      claudeResponse('{"required_skills":["devops"],"experience_level":"senior"}'),
      claudeResponse('{"match_score":88,"reasoning":"good fit","gaps":[]}'),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch(
      '/tmp/resume.md',
      { description: 'DevOps' },
      { logger }
    );
    assert.strictEqual(result.matchScore, 88);
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.confidence, 'medium');
    assert.strictEqual(result.aiAnalysis.reasoning, 'good fit');
    assert.ok(result.aiAnalysis.resumeAnalysis);
    assert.ok(result.aiAnalysis.jobAnalysis);
  });

  it('calculateAIMatch returns fallback when both analyses return null', async () => {
    mockLoadResume();
    mock.method(globalThis, 'fetch', async () => claudeResponse('not-json'));

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.fallback, true);
    assert.strictEqual(result.reasoning, 'AI 분석 실패');
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.aiAnalysis, null);
  });

  it('calculateAIMatch catches loadResume failure', async () => {
    mock.method(fs, 'existsSync', () => false);
    syncBuiltinESMExports();

    const result = await ai.calculateAIMatch('/missing.md', { description: 'd' }, { logger });
    assert.strictEqual(result.fallback, true);
    assert.match(result.reasoning, /AI 분석 오류:/);
  });

  it('calculateAIMatchScore: claude fails → score 0 with AI 분석 실패 (line 113)', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"]}'),
      claudeResponse('{"required_skills":["devops"]}'),
      new Response('fail', { status: 500 }),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.aiAnalysis.reasoning, 'AI 분석 실패');
  });

  it('calculateAIMatchScore: no JSON match → score 0 with 응답 파싱 실패 (line 117)', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"]}'),
      claudeResponse('{"required_skills":["devops"]}'),
      claudeResponse('plain text no json'),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.aiAnalysis.reasoning, '응답 파싱 실패');
  });

  it('calculateAIMatchScore: JSON parse error → score 0 with 파싱 오류 (line 126)', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"]}'),
      claudeResponse('{"required_skills":["devops"]}'),
      claudeResponse('{invalid-json}'),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.aiAnalysis.reasoning, '파싱 오류');
  });

  it('calculateAIMatchScore: missing match_score → || 0 fallback (line 121)', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"]}'),
      claudeResponse('{"required_skills":["devops"]}'),
      claudeResponse('{"reasoning":"no score field"}'),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.matchScore, 0);
    assert.strictEqual(result.aiAnalysis.reasoning, 'no score field');
  });

  it('calculateAIMatchScore: missing reasoning → || empty string (line 122)', async () => {
    mockLoadResume();
    const responses = [
      claudeResponse('{"skills":["devops"]}'),
      claudeResponse('{"required_skills":["devops"]}'),
      claudeResponse('{"match_score":75}'),
    ];
    mock.method(globalThis, 'fetch', async () => responses.shift());

    const result = await ai.calculateAIMatch('/tmp/resume.md', { description: 'd' }, { logger });
    assert.strictEqual(result.matchScore, 75);
    assert.strictEqual(result.aiAnalysis.reasoning, '');
  });

  it('extractKeywordsWithAI returns parsed keywords', async () => {
    mock.method(globalThis, 'fetch', async () =>
      claudeResponse(
        '{"keywords":["devops"],"tech_stack":["k8s"],"importance_scores":{"devops":1}}'
      )
    );
    const result = await ai.extractKeywordsWithAI('text');
    assert.deepEqual(result, {
      keywords: ['devops'],
      tech_stack: ['k8s'],
      importance_scores: { devops: 1 },
    });
  });

  it('extractKeywordsWithAI passes custom category to prompt', async () => {
    let capturedBody;
    mock.method(globalThis, 'fetch', async (_, init) => {
      capturedBody = JSON.parse(init.body);
      return claudeResponse('{"keywords":["react"],"tech_stack":[],"importance_scores":{}}');
    });
    await ai.extractKeywordsWithAI('text', 'frontend');
    assert.ok(capturedBody.messages[0].content.includes('frontend'));
  });

  it('extractKeywordsWithAI returns fallback when no JSON', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('no json'));
    const result = await ai.extractKeywordsWithAI('text', 'tech', { logger });
    assert.deepEqual(result, { keywords: [], tech_stack: [], importance_scores: {} });
  });

  it('extractKeywordsWithAI returns fallback on parse error', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{invalid-json}'));
    const result = await ai.extractKeywordsWithAI('text', 'tech', { logger });
    assert.deepEqual(result, { keywords: [], tech_stack: [], importance_scores: {} });
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('matchJobsWithAI batches jobs, filters by score, and limits results', async () => {
    mockLoadResume();
    const scores = [95, 82, 65, 40, 70, 88];
    let matchCounter = 0;

    mock.method(globalThis, 'fetch', async (_, init) => {
      const body = JSON.parse(init.body);
      const content = body.messages[0].content;

      if (content.includes('이력서를 분석하여')) {
        return claudeResponse('{"skills":["devops"],"experience_level":"senior"}');
      }
      if (content.includes('채용 공고를 분석하여')) {
        return claudeResponse('{"required_skills":["devops"]}');
      }
      if (content.includes('매칭도를 분석해주세요')) {
        const score = scores[matchCounter++];
        return claudeResponse(`{"match_score":${score},"reasoning":"score-${score}"}`);
      }
      return claudeResponse('{}');
    });

    const jobs = Array.from({ length: 6 }, (_, i) => ({
      position: `Job-${i}`,
      description: `Role ${i}`,
    }));

    const result = await ai.matchJobsWithAI('/tmp/resume.md', jobs, {
      minScore: 80,
      maxResults: 2,
      logger,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.jobs.length, 2);
    assert.ok(result.jobs[0].matchScore >= result.jobs[1].matchScore);
    assert.ok(result.jobs.every((j) => j.matchScore >= 80));
    assert.strictEqual(result.resumeAnalysis.aiMatchCount, 2);
    assert.strictEqual(result.resumeAnalysis.basicMatchCount, 6);
    assert.strictEqual(result.jobs[0].matchType, 'ai');
    assert.strictEqual(result.jobs[0].matchPercentage, result.jobs[0].matchScore);
  });

  it('matchJobsWithAI handles per-job errors gracefully', async () => {
    mockLoadResume();
    mock.method(globalThis, 'fetch', async (_, init) => {
      const body = JSON.parse(init.body);
      const content = body.messages[0].content;

      if (content.includes('이력서를 분석하여')) {
        return claudeResponse('{"skills":["devops"]}');
      }
      if (content.includes('채용 공고를 분석하여')) {
        return claudeResponse('{"required_skills":["devops"]}');
      }
      if (content.includes('매칭도를 분석해주세요')) {
        return claudeResponse('{"match_score":75,"reasoning":"ok"}');
      }
      return claudeResponse('{}');
    });

    const result = await ai.matchJobsWithAI(
      '/tmp/resume.md',
      [
        { position: 'good-job', description: 'works' },
        {
          position: 'explode-job',
          get description() {
            throw new Error('boom');
          },
        },
      ],
      { logger }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.jobs.length, 1);
    assert.strictEqual(result.jobs[0].matchScore, 75);
    assert.ok(logger.error.mock.calls.length >= 1);
  });

  it('matchJobsWithAI skips jobs with null analysis', async () => {
    mockLoadResume();
    mock.method(globalThis, 'fetch', async (_, init) => {
      const body = JSON.parse(init.body);
      const content = body.messages[0].content;

      if (content.includes('이력서를 분석하여')) {
        return claudeResponse('{"skills":["devops"]}');
      }
      if (content.includes('채용 공고를 분석하여')) {
        return claudeResponse('no json here');
      }
      return claudeResponse('{}');
    });

    const result = await ai.matchJobsWithAI(
      '/tmp/resume.md',
      [{ position: 'A', description: 'desc' }],
      { logger }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.jobs.length, 0);
  });

  it('matchJobsWithAI returns error when resume analysis fails', async () => {
    mockLoadResume();
    mock.method(globalThis, 'fetch', async () => claudeResponse('not-json'));

    const result = await ai.matchJobsWithAI(
      '/tmp/resume.md',
      [{ position: 'A', description: 'desc' }],
      { logger }
    );

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Resume analysis failed/);
    assert.strictEqual(result.resumeAnalysis, null);
  });

  it('getCareerAdvice returns parsed JSON on success', async () => {
    mock.method(globalThis, 'fetch', async () =>
      claudeResponse('{"suitability":"high","next_steps":["apply"]}')
    );
    const result = await ai.getCareerAdvice({ s: 1 }, { j: 1 }, { m: 1 }, { logger });
    assert.deepEqual(result, { suitability: 'high', next_steps: ['apply'] });
  });

  it('getCareerAdvice returns null when claude fails', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('err', { status: 500 }));
    const result = await ai.getCareerAdvice({ s: 1 }, { j: 1 }, { m: 1 }, { logger });
    assert.strictEqual(result, null);
  });

  it('getCareerAdvice returns null when no JSON', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('no json'));
    const result = await ai.getCareerAdvice({ s: 1 }, { j: 1 }, { m: 1 }, { logger });
    assert.strictEqual(result, null);
  });

  it('getCareerAdvice returns null on parse error', async () => {
    mock.method(globalThis, 'fetch', async () => claudeResponse('{invalid-json}'));
    const result = await ai.getCareerAdvice({ s: 1 }, { j: 1 }, { m: 1 }, { logger });
    assert.strictEqual(result, null);
    assert.strictEqual(logger.error.mock.calls.length, 1);
  });

  it('getAICareerAdvice is alias for getCareerAdvice', () => {
    assert.strictEqual(ai.getAICareerAdvice, ai.getCareerAdvice);
  });
});
