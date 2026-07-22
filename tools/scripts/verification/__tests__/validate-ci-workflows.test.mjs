import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { validateCIWorkflows } from '../validate-ci-workflows.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
let fixtureRoot;

beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), 'ci-workflows-'));
  cpSync(path.join(repositoryRoot, '.github'), path.join(fixtureRoot, '.github'), {
    recursive: true,
  });
});

afterEach(() => rmSync(fixtureRoot, { recursive: true, force: true }));

function mutate(workflow, from, to) {
  const file = path.join(fixtureRoot, '.github/workflows', workflow);
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(from), `fixture token missing: ${from}`);
  writeFileSync(file, source.replace(from, to));
}

function rejects(message) {
  assert.throws(() => validateCIWorkflows(fixtureRoot), message);
}

describe('strict CI workflow contracts', () => {
  it('accepts the root strict gate topology', () => {
    const result = validateCIWorkflows(repositoryRoot);
    assert.deepEqual(result.jobs, [
      'architecture-hardening',
      'wrangler-dry-run',
      'merged-worker-e2e',
    ]);
  });

  for (const job of ['architecture-hardening', 'wrangler-dry-run', 'merged-worker-e2e']) {
    it(`rejects missing ${job} summary dependency`, () => {
      mutate('ci.yml', `        ${job},\n`, '');
      rejects(new RegExp(`${job}.*summary`, 'u'));
    });

    it(`rejects a summary that can ignore failed ${job}`, () => {
      mutate('ci.yml', `                "\${{ needs.${job}.result }}" != "success" || \\\n`, '');
      rejects(new RegExp(`${job}.*failure|failure.*${job}`, 'u'));
    });

    it(`rejects a summary that can ignore cancelled ${job}`, () => {
      mutate(
        'ci.yml',
        `"\${{ needs.${job}.result }}" != "success"`,
        `"\${{ needs.${job}.result }}" == "failure"`
      );
      rejects(new RegExp(`${job}.*cancel`, 'u'));
    });
  }

  it('rejects a CI aggregate other than the exact core script', () => {
    mutate('ci.yml', 'npm run verify:architecture-hardening:core', 'npm run verify:worker-config');
    rejects(/architecture-hardening:core/u);
  });

  it('rejects a merged-worker job that does not use the root Wrangler server', () => {
    mutate('ci.yml', 'RUN_EXTERNAL_E2E=1', 'SKIP_WEBSERVER=1 RUN_EXTERNAL_E2E=1');
    rejects(/root Wrangler|SKIP_WEBSERVER/u);
  });
});

describe('strict post-deploy workflow contracts', () => {
  it('rejects a push path filter', () => {
    mutate(
      'post-deploy-verify.yml',
      '    branches: [master]\n',
      '    branches: [master]\n    paths: [apps/**]\n'
    );
    rejects(/path filter/u);
  });

  it('rejects missing or optional dispatch expected_sha', () => {
    mutate('post-deploy-verify.yml', '        required: true', '        required: false');
    rejects(/expected_sha/u);
  });

  it('rejects a schedule baseline that accepts a short SHA', () => {
    mutate(
      'post-deploy-verify.yml',
      '[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]]',
      '[[ -n "$EXPECTED_SHA" ]]'
    );
    rejects(/schedule.*full SHA|40-character/u);
  });

  it('rejects fixed waits, prefix matching, freshness fallback, or synthetic checks', () => {
    mutate(
      'post-deploy-verify.yml',
      '      - name: Resolve immutable expected SHA',
      '      - run: sleep 180\n      - name: Resolve immutable expected SHA'
    );
    rejects(/fixed wait|sleep/u);
  });

  it('rejects superseded handling that can mutate issues', () => {
    mutate(
      'post-deploy-verify.yml',
      "if: steps.final.outputs.superseded != 'true'",
      'if: always()'
    );
    rejects(/superseded.*issue/u);
  });
});
