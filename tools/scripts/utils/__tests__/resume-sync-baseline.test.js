const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const canonicalPaths = require('../resume-data-paths.js');
const { runSync } = require('../resume-sync-runner.js');
const { isolatedRoot } = require('./resume-sync-test-helpers.js');

const OUTPUT_NAMES = ['data.json', 'data_en.json', 'data_ja.json'];
const baselineRoot = isolatedRoot();
const sourceDir = path.join(baselineRoot, 'sources');
const outputDir = path.join(baselineRoot, 'outputs');
fs.mkdirSync(sourceDir);

for (const source of canonicalPaths.LANGUAGE_SOURCES) {
  const copied = JSON.parse(fs.readFileSync(source.sourcePath, 'utf8'));
  copied.summary.experienceStart = '2015.03';
  fs.writeFileSync(
    path.join(sourceDir, path.basename(source.sourcePath)),
    `${JSON.stringify(copied, null, 2)}\n`
  );
}

after(() => fs.rmSync(baselineRoot, { recursive: true, force: true }));

describe('resume sync baseline characterization', () => {
  it('emits the established filenames with observable experience derivation', () => {
    // Given: the canonical source mapping and a copied experience-start fixture.
    const currentUtc = new Date();
    let expectedYears = currentUtc.getUTCFullYear() - 2015;
    if (currentUtc.getUTCMonth() + 1 < 3) expectedYears -= 1;
    const messages = [];
    const originalLog = console.log;
    console.log = (...values) => messages.push(values.join(' '));

    // When: the characterized generator runs with the captured UTC date.
    try {
      runSync({ asOf: currentUtc.toISOString().slice(0, 10), sourceDir, outputDir });
    } finally {
      console.log = originalLog;
    }

    // Then: the three filenames and derived experience remain observable.
    assert.deepEqual(
      canonicalPaths.LANGUAGE_SOURCES.map(({ webDataPath }) => path.basename(webDataPath)),
      OUTPUT_NAMES
    );
    assert.deepEqual(fs.readdirSync(outputDir).sort(), [...OUTPUT_NAMES].sort());
    assert.ok(messages.some((message) => message.includes(`(${expectedYears}년)`)));
  });
});
