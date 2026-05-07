import assert from 'node:assert/strict';
import test from 'node:test';

import { getPipelinePlatform, scorePipelineJob } from './search.js';

test('getPipelinePlatform accepts wanted, jobkorea, and saramin', () => {
  assert.equal(getPipelinePlatform('wanted'), 'wanted');
  assert.equal(getPipelinePlatform('jobkorea'), 'jobkorea');
  assert.equal(getPipelinePlatform('saramin'), 'saramin');
});

test('getPipelinePlatform rejects unknown platforms gracefully', () => {
  assert.throws(() => getPipelinePlatform('linkedin'), /Unsupported pipeline platform: linkedin/);
});

test('scorePipelineJob dispatches by explicit platform without wanted fallback', async () => {
  const calls = [];
  const scorers = {
    wanted: async () => calls.push('wanted'),
    jobkorea: async () => calls.push('jobkorea'),
    saramin: async () => calls.push('saramin'),
  };

  await scorePipelineJob({ source: 'wanted' }, scorers);
  await scorePipelineJob({ source: 'jobkorea' }, scorers);
  await scorePipelineJob({ source: 'saramin' }, scorers);

  assert.deepEqual(calls, ['wanted', 'jobkorea', 'saramin']);
  await assert.rejects(
    () => scorePipelineJob({ source: 'remember' }, scorers),
    /Unsupported pipeline platform: remember/
  );
});
