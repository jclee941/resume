import { test } from 'node:test';
import assert from 'node:assert/strict';

import { submitApprovedApplications } from '../application-submissions.js';

test('a dry run previews the best JobKorea jobs through the submitter and submits nothing', async () => {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];
  /** @type {Array<Record<string, unknown>>} */
  const recorded = [];
  const ctx = {
    logWorkflowStep: async () => {},
    generateCoverLetter: async () => '',
    getResume: async () => null,
    submitApplication: async (params) => {
      calls.push(params);
      return { success: false, preview: true, status: 'preview', onPassReached: true };
    },
    recordApplication: async (record) => void recorded.push(record),
  };
  const step = { do: async (_name, _config, fn) => fn(), sleep: async () => {} };
  const workflow = { id: 'wf', stats: { jobsApplied: 0, jobsFailed: 0 }, steps: [], errors: [] };
  const jobs = [
    { id: 'wanted-1', source: 'wanted', company: 'W' },
    ...[1, 2, 3, 4].map((n) => ({ id: `jobkorea-${n}`, source: 'jobkorea', company: `J${n}` })),
  ];

  const results = await submitApprovedApplications(ctx, step, workflow, jobs, 'default', true);

  assert.deepEqual(
    calls.map((call) => [call.jobId, call.preview]),
    [
      ['jobkorea-1', true],
      ['jobkorea-2', true],
      ['jobkorea-3', true],
    ]
  );
  assert.equal(results.filter((result) => result.action === 'previewed_submit').length, 3);
  assert.ok(results.every((result) => result.networkWrite === false));
  assert.deepEqual(recorded, []);
  assert.equal(workflow.stats.jobsApplied, 0);
});
