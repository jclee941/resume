import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validateArchitectureDocs } from '../architecture-docs-validator.mjs';
import { createFixture } from './architecture-docs-fixture.mjs';

const ROOT = join(import.meta.dirname, '../../../..');
const ADR_DIR = join(ROOT, 'docs/adr');
const CLI = join(ROOT, 'tools/scripts/verification/validate-architecture-docs.mjs');

test('characterizes ADR filenames, metadata styles, template, and index coverage', () => {
  // Given: the pre-validator ADR corpus and documentation index.
  const filenames = readdirSync(ADR_DIR)
    .filter((name) => /^\d{4}-.*\.md$/.test(name))
    .sort();
  const documents = filenames.map((name) => readFileSync(join(ADR_DIR, name), 'utf8'));
  const index = readFileSync(join(ROOT, 'docs/README.md'), 'utf8');

  // When: current structure and metadata spellings are inventoried.
  const ids = filenames.map((name) => name.slice(0, 4));
  const dashStyleCount = documents.filter((text) => /^- Status:/m.test(text)).length;
  const boldStyleCount = documents.filter((text) => /^\*\*Status:\*\*/m.test(text)).length;

  // Then: the known baseline is explicit before governance normalization.
  assert.deepEqual(ids, ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009']);
  assert.equal(dashStyleCount, 7);
  assert.equal(boldStyleCount, 2);
  assert.equal(existsSync(join(ADR_DIR, 'template.md')), true);
  assert.equal(index.includes('0008-drop-bazel-facade.md'), true);
  assert.equal(index.includes('0009-single-worker-consolidation.md'), true);
});

function validateFixture(t, options = {}, mode = 'governance-only') {
  const root = mkdtempSync(join(tmpdir(), 'architecture-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  createFixture(root, options);
  return { root, result: validateArchitectureDocs(root, mode) };
}

test('accepts both metadata styles, partial note, chain, and free-text supersession', (t) => {
  // Given: valid dash/bold metadata, ADR 0001's partial note, and the 0006→0007→0009 chain.
  const { result } = validateFixture(t);
  // When: governance validation runs. Then: all numbered ADRs pass.
  assert.equal(result.status, 'ok');
  assert.deepEqual(
    result.adrs.map(({ id }) => id),
    ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009']
  );
});

test('excludes ADR template from inventory', (t) => {
  // Given: the valid fixture includes a Proposed template. When: governance validation runs.
  const { result } = validateFixture(t);
  // Then: the template is not parsed as a numbered decision.
  assert.equal(
    result.adrs.some(({ file }) => file.endsWith('template.md')),
    false
  );
});

for (const scenario of [
  ['rejects missing index coverage', { missingIndex: '0008' }, 'missing-index'],
  [
    'rejects invalid supersession direction',
    {
      adrBodies: {
        '0007':
          '# ADR 0007\n\n- Status: Superseded by [ADR 0006](0006-decision.md)\n- Date: 2026-01-01\n',
      },
    },
    'invalid-supersession-direction',
  ],
  [
    'rejects missing supersession target',
    {
      adrBodies: {
        '0006':
          '# ADR 0006\n\n- Status: Superseded by [ADR 0010](0010-missing.md)\n- Date: 2026-01-01\n',
      },
    },
    'missing-supersession-target',
  ],
  [
    'rejects broken link',
    {
      adrBodies: {
        '0002':
          '# ADR 0002\n\n- Status: Accepted\n- Date: 2026-01-01\n\n[Missing](../missing.md)\n',
      },
    },
    'broken-link',
  ],
  [
    'rejects malformed status metadata',
    { adrBodies: { '0002': '# ADR 0002\n\n- Status: accepted\n- Date: 2026-01-01\n' } },
    'invalid-status',
  ],
  [
    'rejects superseded label and href target mismatch',
    {
      adrBodies: {
        '0006':
          '# ADR 0006\n\n- Status: Superseded by [ADR 0009](0007-decision.md)\n- Date: 2026-01-01\n',
      },
    },
    'adr-link-label-mismatch',
  ],
  [
    'rejects supersedes label and href target mismatch',
    {
      adrBodies: {
        '0009':
          '# ADR 0009\n\n- Status: Accepted\n- Date: 2026-01-01\n- Supersedes: [ADR 0006](./0007-decision.md)\n',
      },
    },
    'adr-link-label-mismatch',
  ],
  [
    'rejects normalized status with trailing garbage',
    {
      adrBodies: {
        '0002': '# ADR 0002\n\n- Status: Proposed arbitrary garbage\n- Date: 2026-01-01\n',
      },
    },
    'invalid-status',
  ],
  ['rejects status index mismatch', { statusMismatch: '0006' }, 'index-status-mismatch'],
]) {
  test(scenario[0], (t) => {
    // Given: one malformed governance fixture. When: it is validated.
    const { result } = validateFixture(t, scenario[1]);
    // Then: the named structural diagnostic is emitted.
    assert.equal(result.status, 'error');
    assert.equal(
      result.diagnostics.some(({ code }) => code === scenario[2]),
      true
    );
  });
}

test('rejects duplicate ADR ID', (t) => {
  // Given: a second file declares the existing ADR 0009 identifier.
  const { root } = validateFixture(t);
  writeFileSync(
    join(root, 'docs/adr/0010-duplicate.md'),
    '# ADR 0009: Duplicate\n\n- Status: Accepted\n- Date: 2026-01-01\n'
  );
  // When: governance validation runs. Then: duplicate metadata IDs fail.
  const result = validateArchitectureDocs(root, 'governance-only');
  assert.equal(
    result.diagnostics.some(({ code }) => code === 'duplicate-id'),
    true
  );
});

for (const claim of [
  'Current routing uses JOB_SERVICE.',
  'Bazel is the current primary build facade.',
  'Cloudflare Queues | Job queue',
]) {
  test(`rejects stale current-state claims in full mode: ${claim}`, (t) => {
    // Given: a structurally valid corpus with one stale current-state claim.
    const { result } = validateFixture(t, { architecture: `# Architecture\n\n${claim}\n` }, 'full');
    // When: full validation runs. Then: stale claims fail explicitly.
    assert.equal(result.status, 'error');
    assert.equal(
      result.diagnostics.some(({ code }) => code === 'stale-current-state-claim'),
      true
    );
  });
}

test('CLI reports exact diagnostics and nonzero status for malformed input', (t) => {
  // Given: a malformed fixture is used as the CLI working directory.
  const { root } = validateFixture(t, { missingIndex: '0008' });
  // When: the real governance CLI is invoked.
  const run = spawnSync(process.execPath, [CLI, '--governance-only'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5_000,
  });
  // Then: machine-readable failure output names the exact diagnostic.
  assert.equal(run.status, 1);
  const receipt = JSON.parse(run.stderr);
  assert.equal(receipt.status, 'error');
  assert.equal(
    receipt.diagnostics.some(({ code }) => code === 'missing-index'),
    true
  );
});
