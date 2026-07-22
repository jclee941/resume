import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const baselineSha = '3f8add1f3fb2c52d93f880f69c569aff4698dbc9';
const baselineImports = [
  ['apps/job-dashboard', 'src/utils/env.js', '@resume/env', 'packages/env'],
  ['packages/contracts', 'src/env.js', '@resume/types', 'packages/types'],
  ['packages/shared', 'src/validation/dashboard.js', 'zod', 'node_modules/zod'],
  [
    'apps/job-server',
    'src/server/plugins/auth.js',
    'fastify-plugin',
    'node_modules/fastify-plugin',
  ],
];

// This characterization test reads the baseline commit via `git show`, so it
// needs that object in the local object store. CI checks out with the default
// shallow depth (fetch-depth: 1) and the baseline is ~73 commits back, so the
// object is absent there. Skip rather than fail: the guard is a historical
// regression check, and a shallow clone simply cannot answer it. It still runs
// on any full clone (local dev, or CI with fetch-depth: 0).
const baselineAvailable = (() => {
  try {
    execFileSync('git', ['cat-file', '-e', `${baselineSha}^{commit}`], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
})();

const baselineIt = baselineAvailable ? it : it.skip;

baselineIt('pins direct production imports that resolved through the baseline install topology', () => {
  // Given: the pre-fix manifests and lock topology plus unchanged production import sites.
  const baselineLock = JSON.parse(
    execFileSync('git', ['show', `${baselineSha}:package-lock.json`], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    })
  );
  const observed = baselineImports.map(([workspace, source, dependency, lockLocation]) => {
    const manifest = JSON.parse(
      execFileSync('git', ['show', `${baselineSha}:${workspace}/package.json`], {
        cwd: repositoryRoot,
        encoding: 'utf8',
      })
    );
    return {
      workspace,
      dependency,
      imported: readFileSync(path.join(repositoryRoot, workspace, source), 'utf8').includes(
        `'${dependency}`
      ),
      declared: Boolean(
        manifest.dependencies?.[dependency] ?? manifest.optionalDependencies?.[dependency]
      ),
      locked: Object.hasOwn(baselineLock.packages, lockLocation),
    };
  });

  // When/Then: every import was present and install-resolvable without direct ownership.
  assert.deepEqual(
    observed,
    baselineImports.map(([workspace, , dependency]) => ({
      workspace,
      dependency,
      imported: true,
      declared: false,
      locked: true,
    }))
  );
});
