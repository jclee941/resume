const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const canonicalPaths = require('../resume-data-paths.js');
const {
  copyCanonicalSources: copySources,
  isolatedRoot,
  preserveFiles,
} = require('./resume-sync-test-helpers.js');

const OUTPUT_NAMES = ['data.json', 'data_en.json', 'data_ja.json'];
function copyCanonicalSources(root) {
  return copySources(root, canonicalPaths.LANGUAGE_SOURCES);
}

const generatedPaths = [
  ...canonicalPaths.LANGUAGE_SOURCES.map(({ webDataPath }) => webDataPath),
  path.join(process.cwd(), 'apps/portfolio/worker.js'),
];
const restoreGeneratedFiles = preserveFiles(generatedPaths);
after(restoreGeneratedFiles);

describe('deterministic resume sync contract', () => {
  it('rejects rollover and non-calendar UTC dates', () => {
    // Given: date strings that JavaScript Date would otherwise normalize.
    const { parseAsOf } = require('../resume-sync-runner.js');

    // When/Then: strict parsing rejects every invalid calendar representation.
    for (const invalid of ['2026-02-30', '2026-13-01', '2026-7-12', 'not-a-date']) {
      assert.throws(() => parseAsOf(invalid), /as-of|YYYY-MM-DD|calendar/i);
    }
  });

  it('prefers CLI as-of over RESUME_AS_OF', () => {
    // Given: valid copied sources, an invalid environment date, and a valid CLI date.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root);
    const outputDir = path.join(root, 'outputs');

    // When: the real CLI receives all injected paths and an explicit as-of.
    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), 'tools/scripts/utils/sync-resume-data.js'),
        '--as-of',
        '2026-07-12',
        '--source-dir',
        sourceDir,
        '--output-dir',
        outputDir,
      ],
      { encoding: 'utf8', env: { ...process.env, RESUME_AS_OF: 'invalid' } }
    );

    // Then: CLI precedence succeeds and creates only the promised snapshots.
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readdirSync(outputDir).sort(), [...OUTPUT_NAMES].sort());
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('emits byte-identical snapshots for the same as-of date', () => {
    // Given: one copied source set and two empty output directories.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root);
    const run1 = path.join(root, 'run-1');
    const run2 = path.join(root, 'run-2');

    // When: both generations use the same explicit date.
    const { runSync: deterministicRunSync } = require('../resume-sync-runner.js');
    deterministicRunSync({ asOf: '2026-07-12', sourceDir, outputDir: run1 });
    deterministicRunSync({ asOf: '2026-07-12', sourceDir, outputDir: run2 });

    // Then: every corresponding output is byte-identical.
    for (const name of OUTPUT_NAMES) {
      assert.deepEqual(
        fs.readFileSync(path.join(run1, name)),
        fs.readFileSync(path.join(run2, name))
      );
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('derives different experience copy for different as-of dates', () => {
    // Given: a copied Korean source with an observable year placeholder.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root);
    const koPath = path.join(sourceDir, 'resume_data.json');
    const koSource = JSON.parse(fs.readFileSync(koPath, 'utf8'));
    koSource.summary.experienceStart = '2015.03';
    koSource.sectionDescriptions.resume = '5년차 인프라 경력';
    fs.writeFileSync(koPath, `${JSON.stringify(koSource, null, 2)}\n`);

    // When: the source is generated before and after its March anniversary.
    const { runSync: deterministicRunSync } = require('../resume-sync-runner.js');
    deterministicRunSync({ asOf: '2026-02-28', sourceDir, outputDir: path.join(root, 'before') });
    deterministicRunSync({ asOf: '2026-03-01', sourceDir, outputDir: path.join(root, 'after') });

    // Then: the public snapshot advances from ten to eleven years.
    const before = JSON.parse(fs.readFileSync(path.join(root, 'before/data.json'), 'utf8'));
    const after = JSON.parse(fs.readFileSync(path.join(root, 'after/data.json'), 'utf8'));
    assert.match(before.sectionDescriptions.resume, /10년차/);
    assert.match(after.sectionDescriptions.resume, /11년차/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects invalid source copied away from canonical data', () => {
    // Given: only a copied source has its required personal field removed.
    const root = isolatedRoot();
    const sourceDir = copyCanonicalSources(root);
    const sourcePath = path.join(sourceDir, 'resume_data.json');
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    delete source.personal;
    fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

    // When/Then: generation rejects before producing snapshots.
    const { runSync: deterministicRunSync } = require('../resume-sync-runner.js');
    assert.throws(
      () =>
        deterministicRunSync({ asOf: '2026-07-12', sourceDir, outputDir: path.join(root, 'out') }),
      /validation|personal/i
    );
    assert.equal(fs.existsSync(path.join(root, 'out')), false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects invalid generated portfolio data through the injected seam', async () => {
    // Given: a verifier generator seam that emits invalid empty objects.
    const root = isolatedRoot();
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    const invalidGenerator = ({ outputDir }) => {
      fs.mkdirSync(outputDir, { recursive: true });
      for (const name of OUTPUT_NAMES) fs.writeFileSync(path.join(outputDir, name), '{}\n');
    };

    // When/Then: canonical portfolio validation rejects the generated shape.
    try {
      await assert.rejects(
        verifyResumeSync({ asOf: '2026-07-12', tempBase: root, generate: invalidGenerator }),
        /Data validation failed|resumeDownload/i
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('cleans only its owned verifier temp root', async () => {
    // Given: a verifier-owned root next to a sentinel file it does not own.
    const parent = isolatedRoot();
    const tempRoot = path.join(parent, 'verify-resume-sync');
    const sentinel = path.join(parent, 'keep.txt');
    fs.writeFileSync(sentinel, 'keep');

    // When: deterministic verification completes.
    const { verifyResumeSync } = await import('../verify-resume-sync.mjs');
    await verifyResumeSync({ asOf: '2026-07-12', tempBase: parent });

    // Then: its unique child is gone and the fixed parent plus sibling remain untouched.
    assert.deepEqual(fs.readdirSync(tempRoot), []);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
    fs.rmSync(parent, { recursive: true, force: true });
  });

  it('orders one data sync before the raw worker build in every root automation path', () => {
    // Given: the root npm command graph.
    const scripts = require('../../../../package.json').scripts;

    // When/Then: build owns the only sync and automation delegates through it once.
    assert.equal(scripts['build:worker'], 'npm run build --workspace=@resume/portfolio-worker');
    assert.equal(scripts.build, 'npm run sync:data && npm run build:worker');
    assert.equal(scripts['build:portfolio'], 'npm run build');
    assert.equal(
      scripts['automate:ssot'],
      'npm run sync:pdf && npm run build && npm run typecheck && npm run test:node'
    );
    assert.equal(
      scripts['automate:full'],
      'npm run sync:pdf && npm run sync:pptx && npm run build && npm run lint && npm run typecheck && npm run test && go run ./tools/ci/validate-cloudflare-native.go'
    );
  });

  it('propagates RESUME_AS_OF through the root build before worker generation', () => {
    // Given: a fixed environment date at the real root build surface.
    // When: the root build performs its sync and raw worker build.
    const result = spawnSync('npm', ['run', 'build'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, RESUME_AS_OF: '2026-07-12' },
    });

    // Then: the fixed date reaches sync before the worker generator starts.
    assert.equal(result.status, 0, result.stderr);
    const syncIndex = result.stdout.indexOf('sync-resume-data start asOf=2026-07-12');
    const workerIndex = result.stdout.indexOf('Starting improved worker generation');
    assert.ok(syncIndex >= 0, 'root build must propagate RESUME_AS_OF');
    assert.ok(workerIndex > syncIndex, 'worker generation must follow data sync');
  });
});
