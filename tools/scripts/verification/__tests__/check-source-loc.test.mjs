import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { countCodeLines, findOversizedFiles } from '../check-source-loc.mjs';

describe('countCodeLines', () => {
  it('skips blank lines, comments, and multi-line string bodies', () => {
    const source = [
      '// header comment',
      '/**',
      ' * JSDoc block',
      ' */',
      'const a = 1;',
      '',
      '/* inline block */',
      'const template = `',
      '  static content line',
      '  more static content',
      '`;',
      'export { a, template };',
    ].join('\n');

    assert.equal(countCodeLines(source), 3);
  });

  it('counts single-line template literals as code', () => {
    assert.equal(countCodeLines('const a = `x`;\nconst b = `y`;'), 2);
  });
});

describe('findOversizedFiles', () => {
  const sources = {
    'apps/a/big.js': 'x();\n'.repeat(201),
    'apps/a/ok.js': 'x();\n'.repeat(200),
    'apps/a/__tests__/big.test.js': 'x();\n'.repeat(500),
    'tools/ci/big_test.go': 'x()\n'.repeat(500),
    'apps/portfolio/worker.js': 'x();\n'.repeat(5000),
    'docs/big.md': 'x\n'.repeat(500),
    'tools/scripts/big.go': 'x()\n'.repeat(250),
  };

  it('reports only non-test, non-generated source files over the limit', () => {
    const result = findOversizedFiles(Object.keys(sources), (file) => sources[file]);

    assert.deepEqual(result, [
      { file: 'tools/scripts/big.go', codeLines: 250 },
      { file: 'apps/a/big.js', codeLines: 201 },
    ]);
  });
});
