import { readFileSync } from 'node:fs';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const analyzeWithClaudeMock = mock.fn(async () => '');
globalThis.__analyzeWithClaudeMock = analyzeWithClaudeMock;

const optimizerSource = readFileSync(new URL('../optimizer.js', import.meta.url), 'utf8').replace(
  /import\s*\{[^}]*\}\s*from\s*['"]\.\.\/matching\/ai-matcher\.js['"]\s*;?/,
  'const { analyzeWithClaude } = { analyzeWithClaude: globalThis.__analyzeWithClaudeMock };'
);
const optimizerEncoded = Buffer.from(optimizerSource).toString('base64');
const { optimizeResume } = await import(`data:text/javascript;base64,${optimizerEncoded}`);

async function loadOptimizer(analyzeWithClaude) {
  analyzeWithClaudeMock.mock.mockImplementation(analyzeWithClaude);
  return { optimizeResume };
}

describe('optimizeResume', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns markdown section when AI response contains markdown heading', async () => {
    const analyzeWithClaude = mock.fn(async () => 'intro\n# Optimized Resume\n## Summary\nupdated');
    const { optimizeResume } = await loadOptimizer(analyzeWithClaude);

    const result = await optimizeResume('# Master Resume\nold', { score: 90, keywords: ['SRE'] });

    assert.equal(result, '# Optimized Resume\n## Summary\nupdated');
    assert.equal(analyzeWithClaude.mock.calls.length, 1);
    const [prompt, suffix] = analyzeWithClaude.mock.calls[0].arguments;
    assert.ok(prompt.includes('# Master Resume\nold'));
    assert.ok(prompt.includes('"score": 90'));
    assert.equal(suffix, '');
  });

  it('returns raw response when markdown heading is not present', async () => {
    const analyzeWithClaude = mock.fn(async () => 'plain optimized text');
    const { optimizeResume } = await loadOptimizer(analyzeWithClaude);

    const result = await optimizeResume('master', { role: 'devops' });

    assert.equal(result, 'plain optimized text');
  });

  it('throws when AI optimization result is falsy', async () => {
    const analyzeWithClaude = mock.fn(async () => '');
    const { optimizeResume } = await loadOptimizer(analyzeWithClaude);

    await assert.rejects(() => optimizeResume('master', { role: 'devops' }), {
      message: '이력서 최적화 실패',
    });
  });
});
