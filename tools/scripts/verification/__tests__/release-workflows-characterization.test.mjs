import assert from 'node:assert/strict';
import { test } from 'node:test';
import YAML from 'yaml';

const baselineRelease = YAML.parse(`
on:
  workflow_run: {workflows: [CI], types: [completed], branches: [master]}
permissions: {contents: write}
jobs:
  release:
    steps:
      - uses: actions/checkout@v7
        with: {ref: master}
      - run: gh release create v1.0.0
`);
const baselineNotes = YAML.parse(`
on: {push: {tags: ['v*']}}
permissions: {contents: write}
jobs: {notes: {steps: [{run: gh release create v1.0.0}]}}
`);
const baselinePublish = YAML.parse(`
on: {push: {branches: [master, main]}}
permissions: {contents: write}
jobs: {publish: {steps: [{run: gh api repos/example/git/refs}]}}
`);

test('characterizes the pre-fix active publisher triggers and moving release target', () => {
  assert.ok(baselineRelease.on.workflow_run);
  assert.deepEqual(baselineNotes.on.push.tags, ['v*']);
  assert.deepEqual(baselinePublish.on.push.branches, ['master', 'main']);
  assert.equal(baselineRelease.jobs.release.steps[0].with.ref, 'master');
});

test('characterizes the pre-fix duplicate publisher observable', () => {
  const publishers = [baselineRelease, baselineNotes, baselinePublish].filter((definition) => {
    const serialized = JSON.stringify(definition);
    return serialized.includes('contents":"write') && /(?:gh release|git\/refs)/u.test(serialized);
  });
  assert.equal(publishers.length, 3);
});
