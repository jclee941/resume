const assert = require('node:assert/strict');
const { before, describe, test } = require('node:test');

function report({ performance = 0.95, lcp = 1900, scriptSize = 150000 } = {}) {
  return {
    categories: {
      performance: { score: performance },
      accessibility: { score: 0.9 },
      'best-practices': { score: 0.95 },
      seo: { score: 0.92 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: lcp },
      'uses-text-compression': { score: 1 },
      'resource-summary': {
        details: {
          items: [{ resourceType: 'script', transferSize: scriptSize }],
        },
      },
    },
  };
}

describe('Lighthouse runner assertion contract', () => {
  let contract;

  before(async () => {
    contract = await import('../../verification/lighthouse-assertions.mjs');
  });

  test('uses a non-mutating median for odd and even run counts', () => {
    const even = [4, 1, 3, 2];
    assert.equal(contract.median(even), 2.5);
    assert.deepEqual(even, [4, 1, 3, 2]);
    assert.equal(contract.median([3, 1, 2]), 2);
    assert.equal(contract.median([]), null);
  });

  test('normalizes tuple and scalar assertion forms', () => {
    assert.deepEqual(contract.normalizeAssertion(['ERROR', { minScore: 0.9 }]), {
      level: 'error',
      options: { minScore: 0.9 },
    });
    assert.deepEqual(contract.normalizeAssertion('WARN'), {
      level: 'warn',
      options: {},
    });
  });

  test('reads category, audit, and resource summary values', () => {
    const lhr = report();
    assert.equal(contract.getAssertionValue(lhr, 'categories:performance', {}), 0.95);
    assert.equal(
      contract.getAssertionValue(lhr, 'largest-contentful-paint', { maxNumericValue: 2500 }),
      1900
    );
    assert.equal(contract.getAssertionValue(lhr, 'resource-summary:script:size', {}), 150000);
    assert.equal(contract.getAssertionValue(lhr, 'missing-audit', {}), null);
  });

  test('gates assertion medians and reports unavailable metrics as warnings', () => {
    const assertions = {
      'categories:performance': ['error', { minScore: 0.9 }],
      'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      'uses-text-compression': 'error',
      'missing-audit': 'error',
      ignored: 'off',
    };
    const summary = contract.summarizeAssertions(
      'mobile',
      [report({ performance: 0.8, lcp: 3000 }), report({ performance: 0.9, lcp: 2000 })],
      assertions
    );
    assert.deepEqual(summary.failures, ['[mobile] categories:performance: 0.850 < minScore 0.9']);
    assert.deepEqual(summary.warnings, [
      '[mobile] missing-audit: metric not available in current Lighthouse version',
    ]);
  });

  test('preserves representative category score names', () => {
    assert.deepEqual(contract.getCategoryScores(report()), {
      performance: 0.95,
      accessibility: 0.9,
      bestPractices: 0.95,
      seo: 0.92,
    });
  });
});
