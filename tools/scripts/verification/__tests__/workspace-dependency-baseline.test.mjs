import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const baselineSha = '89b804787e6086762d1253e6e92d16213286ae95';
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

it('pins direct production imports that resolved through the baseline install topology', () => {
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
