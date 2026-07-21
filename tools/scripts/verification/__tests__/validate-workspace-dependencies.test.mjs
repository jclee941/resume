import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateWorkspaceDependencies } from '../validate-workspace-dependencies.mjs';

const currentRuntimeImports = [
  ['apps/job-dashboard', 'src/utils/env.js', '@resume/env'],
  ['packages/contracts', 'src/env.js', '@resume/types'],
  ['packages/shared', 'src/validation/dashboard.js', 'zod'],
  ['apps/job-server', 'src/server/plugins/auth.js', 'fastify-plugin'],
];
const dependencyVersions = new Map([
  ['@resume/env', '*'],
  ['@resume/types', '*'],
  ['zod', '^4.4.3'],
  ['fastify-plugin', '^5.0.0'],
]);

function writeFixture(options = {}) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'resume-workspace-deps-'));
  for (const [workspace, source, dependency] of currentRuntimeImports) {
    const workspaceRoot = path.join(fixtureRoot, workspace);
    mkdirSync(path.dirname(path.join(workspaceRoot, source)), { recursive: true });
    writeFileSync(path.join(workspaceRoot, source), `import '${dependency}/subpath';\n`);
    const dependencies = { [dependency]: dependencyVersions.get(dependency) };
    if (options.missing === dependency) delete dependencies[dependency];
    writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify({ dependencies }));
  }
  return fixtureRoot;
}

function removeFixture(fixtureRoot) {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

describe('Workspace dependency policy', () => {
  for (const [workspace, , dependency] of currentRuntimeImports) {
    it(`reports importer and undeclared package for ${workspace} -> ${dependency}`, () => {
      // Given: all exact pairs imported, with one declaration missing.
      const fixtureRoot = writeFixture({ missing: dependency });

      try {
        // When/Then: the diagnostic identifies both owner and package.
        assert.throws(
          () => validateWorkspaceDependencies(fixtureRoot),
          new RegExp(`${workspace.replaceAll('/', '\\/')}.*${dependency.replace('/', '\\/')}`, 'u')
        );
      } finally {
        removeFixture(fixtureRoot);
      }
    });
  }

  it('accepts optionalDependencies as direct runtime ownership', () => {
    const fixtureRoot = writeFixture();
    const manifestPath = path.join(fixtureRoot, 'packages/shared/package.json');
    writeFileSync(manifestPath, JSON.stringify({ optionalDependencies: { zod: '^4.4.3' } }));

    try {
      assert.doesNotThrow(() => validateWorkspaceDependencies(fixtureRoot));
    } finally {
      removeFixture(fixtureRoot);
    }
  });

  it('ignores dev/test files, build output, and runtime-scheme imports', () => {
    const fixtureRoot = writeFixture();
    const dashboardRoot = path.join(fixtureRoot, 'apps/job-dashboard');
    for (const relative of [
      'src/example.test.js',
      'src/example.spec.mjs',
      'src/__tests__/example.js',
      'fixtures/example.cjs',
      'scripts/example.js',
      'examples/example.js',
      'dist/example.js',
      'eslint.config.js',
    ]) {
      mkdirSync(path.dirname(path.join(dashboardRoot, relative)), { recursive: true });
      writeFileSync(path.join(dashboardRoot, relative), "import '@resume/env';\n");
    }
    writeFileSync(
      path.join(dashboardRoot, 'src/utils/env.js'),
      "import 'node:path';\nimport 'cloudflare:workers';\nimport './local.js';\n"
    );

    try {
      assert.throws(
        () => validateWorkspaceDependencies(fixtureRoot),
        /apps\/job-dashboard -> @resume\/env: no production importer found/u
      );
    } finally {
      removeFixture(fixtureRoot);
    }
  });

  it('does not treat comments, string literals, or symlink escapes as production imports', () => {
    const fixtureRoot = writeFixture();
    const dashboardRoot = path.join(fixtureRoot, 'apps/job-dashboard');
    const outsideRoot = mkdtempSync(path.join(tmpdir(), 'resume-workspace-deps-outside-'));
    writeFileSync(
      path.join(dashboardRoot, 'src/utils/env.js'),
      "// import '@resume/env';\nconst example = \"import '@resume/env'\";\n"
    );
    writeFileSync(path.join(outsideRoot, 'escape.js'), "import '@resume/env';\n");
    symlinkSync(outsideRoot, path.join(dashboardRoot, 'src/linked-outside'));

    try {
      assert.throws(
        () => validateWorkspaceDependencies(fixtureRoot),
        /apps\/job-dashboard -> @resume\/env: no production importer found/u
      );
    } finally {
      removeFixture(fixtureRoot);
      removeFixture(outsideRoot);
    }
  });

  for (const [name, source] of [
    ['block comments', "/*\nimport '@resume/env';\n*/\n"],
    ['multiline templates', "const example = `\nimport '@resume/env';\n`;\n"],
  ]) {
    it(`does not treat ${name} as executable imports`, () => {
      const fixtureRoot = writeFixture();
      writeFileSync(path.join(fixtureRoot, 'apps/job-dashboard/src/utils/env.js'), source);

      try {
        assert.throws(
          () => validateWorkspaceDependencies(fixtureRoot),
          /apps\/job-dashboard -> @resume\/env: no production importer found/u
        );
      } finally {
        removeFixture(fixtureRoot);
      }
    });
  }

  it('does not widen the audit for an unrelated production bare import', () => {
    const fixtureRoot = writeFixture();
    writeFileSync(
      path.join(fixtureRoot, 'apps/job-dashboard/src/unrelated.js'),
      "import '@cloudflare/puppeteer';\nimport 'prom-client';\nimport 'undici';\n"
    );

    try {
      const inventory = validateWorkspaceDependencies(fixtureRoot);
      assert.deepEqual(
        inventory.map(({ workspace, dependency }) => [workspace, dependency]),
        currentRuntimeImports.map(([workspace, , dependency]) => [workspace, dependency])
      );
    } finally {
      removeFixture(fixtureRoot);
    }
  });

  it('rejects malformed package metadata at the workspace boundary', () => {
    const fixtureRoot = writeFixture();
    writeFileSync(path.join(fixtureRoot, 'packages/contracts/package.json'), '{ "dependencies": ');

    try {
      assert.throws(
        () => validateWorkspaceDependencies(fixtureRoot),
        /packages\/contracts.*package\.json/u
      );
    } finally {
      removeFixture(fixtureRoot);
    }
  });

  it('rejects a malformed dependencies shape', () => {
    const fixtureRoot = writeFixture();
    writeFileSync(
      path.join(fixtureRoot, 'apps/job-server/package.json'),
      JSON.stringify({ dependencies: ['fastify-plugin'] })
    );

    try {
      assert.throws(
        () => validateWorkspaceDependencies(fixtureRoot),
        /apps\/job-server.*dependencies/u
      );
    } finally {
      removeFixture(fixtureRoot);
    }
  });
});
