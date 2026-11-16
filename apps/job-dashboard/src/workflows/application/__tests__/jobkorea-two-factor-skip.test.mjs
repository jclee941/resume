import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JOBKOREA_2FA_REQUIRED } from '../../../handlers/jobkorea/mint-session.js';
import { submitApprovedApplications } from '../application-submissions.js';
import { notifyCompletion } from '../workflow-notifications.js';
import { submitJobKoreaApplication } from '../jobkorea-submit.js';

const step = { do: async (_name, _options, callback) => callback(), sleep: async () => {} };
const makeJob = (source, n) => ({
  id: `${source}-${n}`,
  source,
  company: 'Example Co',
  position: 'Security Engineer',
  matchScore: 80,
});

describe('JobKorea two-factor login', () => {
  it('carries the 2FA code out of a failed mint', async () => {
    const error = Object.assign(new Error(JOBKOREA_2FA_REQUIRED), { code: JOBKOREA_2FA_REQUIRED });
    const result = await submitJobKoreaApplication({}, 'jobkorea-1', {
      withBrowserSession: async (_env, fn) => fn({}),
      mint: async () => {
        throw error;
      },
    });

    assert.equal(result.success, false);
    assert.equal(result.code, JOBKOREA_2FA_REQUIRED);
  });

  it('skips the remaining JobKorea jobs after the first 2FA failure', async () => {
    const submitted = [];
    const recorded = [];
    const ctx = {
      generateCoverLetter: async () => 'cover',
      getResume: async () => ({}),
      recordApplication: async (record) => void recorded.push(record.jobId),
      logWorkflowStep: async () => {},
      submitApplication: async ({ platform, jobId }) => {
        submitted.push(jobId);
        return platform === 'jobkorea'
          ? { success: false, error: JOBKOREA_2FA_REQUIRED, code: JOBKOREA_2FA_REQUIRED }
          : { success: true };
      },
    };
    const workflow = {
      id: 'wf',
      stats: { jobsApplied: 0, jobsFailed: 0 },
      steps: [],
      errors: [],
    };
    const jobs = [
      makeJob('jobkorea', 1),
      makeJob('jobkorea', 2),
      makeJob('wanted', 3),
      makeJob('jobkorea', 4),
    ];

    const results = await submitApprovedApplications(ctx, step, workflow, jobs, 'resume', false);

    assert.deepEqual(submitted, ['jobkorea-1', 'wanted-3']);
    assert.deepEqual(recorded, ['wanted-3']);
    assert.equal(workflow.stats.jobsApplied, 1);
    assert.equal(workflow.stats.jobsFailed, 1);
    assert.equal(workflow.errors.length, 1);
    assert.deepEqual(
      results.map((result) => result.status ?? 'ok'),
      ['ok', 'skipped', 'ok', 'skipped']
    );
    assert.equal(results[1].reason, JOBKOREA_2FA_REQUIRED);
  });

  it('adds one 2FA line to the completion notification', async () => {
    const texts = [];
    const service = { sendTelegramNotification: async ({ text }) => void texts.push(text) };
    const stats = { jobsFound: 3, jobsApproved: 3, jobsApplied: 0, jobsFailed: 1 };

    await notifyCompletion(
      service,
      { stats, errors: [{ code: JOBKOREA_2FA_REQUIRED }] },
      't',
      false,
      []
    );
    await notifyCompletion(service, { stats, errors: [] }, 't', false, []);

    assert.match(texts[0], /two-factor/);
    assert.doesNotMatch(texts[1], /two-factor/);
  });
});
