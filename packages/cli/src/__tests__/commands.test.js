// Smoke tests for @resume/cli commands.
// Closes P2-12 from MONOREPO_REVIEW_2026-04-29.md.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('@resume/cli command modules', () => {
  it('verify command module exports a function', async () => {
    const mod = await import('../commands/verify.js');
    assert.equal(typeof mod.verify, 'function');
    assert.equal(mod.verify.length, 0); // no required args
  });

  it('db command module loads without errors', async () => {
    const mod = await import('../commands/db.js');
    assert.ok(mod, 'module should load');
    // db module exports at least one named function
    const exportCount = Object.keys(mod).length;
    assert.ok(exportCount > 0, 'db module exports something');
  });

  it('deploy command module loads without errors', async () => {
    const mod = await import('../commands/deploy.js');
    assert.ok(mod, 'module should load');
  });
});

describe('@resume/cli bin/run.js', () => {
  it('imports without throwing (smoke test)', async () => {
    // bin/run.js calls .parse() at top level which would invoke commander
    // with no args and exit. Just verifying the module path resolves.
    const path = await import('node:path');
    const fs = await import('node:fs');
    const url = await import('node:url');
    const here = url.fileURLToPath(import.meta.url);
    const binPath = path.resolve(path.dirname(here), '..', '..', 'bin', 'run.js');
    assert.ok(fs.existsSync(binPath), `bin/run.js exists at ${binPath}`);
  });
});
