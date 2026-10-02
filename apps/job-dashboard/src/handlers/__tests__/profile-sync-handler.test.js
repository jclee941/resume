import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ProfileSyncHandler } from '../profile-sync-handler.js';

function fakeJobDb(storedRow) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        bind(...args) {
          statements.push({ sql, args });
          return {
            first: async () => (sql.startsWith('SELECT data') ? storedRow : null),
            run: async () => ({}),
          };
        },
      };
    },
  };
}

function request(body) {
  return new Request('https://resume.example/api/automation/profile-sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const STORED = {
  data: JSON.stringify({ personal: { name: 'Tester' }, awards: [] }),
  target_resume_id: 'W-100',
};

describe('ProfileSyncHandler', () => {
  it('syncs the JOB_DB master resume to the Worker-native platforms by default', async () => {
    const db = fakeJobDb(STORED);
    const handler = new ProfileSyncHandler({ JOB_DB: db });
    handler.syncPlatform = mock.fn(async (_env, platform) => ({ platform, success: true }));

    const response = await handler.triggerProfileSync(request({ dryRun: true }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.platforms, ['wanted', 'jobkorea', 'skcareers', 'remember']);
    assert.deepEqual(
      handler.syncPlatform.mock.calls.map((call) => [call.arguments[1], call.arguments[3]]),
      [
        ['wanted', { dryRun: true, targetResumeId: 'W-100' }],
        ['jobkorea', { dryRun: true, targetResumeId: 'W-100' }],
        ['skcareers', { dryRun: true, targetResumeId: 'W-100' }],
        ['remember', { dryRun: true, targetResumeId: 'W-100' }],
      ]
    );
    const update = db.statements.find((s) => s.sql.startsWith('UPDATE profile_syncs'));
    assert.equal(update.args[0], 'dry_run_complete');
  });

  it('marks the run failed when a platform cannot sync', async () => {
    const handler = new ProfileSyncHandler({ JOB_DB: fakeJobDb(STORED) });

    const response = await handler.triggerProfileSync(
      request({ dryRun: true, platforms: ['saramin'] })
    );
    const body = await response.json();

    assert.equal(body.success, false);
    assert.match(body.platformResults.saramin.error, /Saramin/);
  });

  it('re-mints an expired JobKorea session and retries the sync once', async () => {
    const handler = new ProfileSyncHandler({ JOB_DB: fakeJobDb(STORED) });
    handler.syncPlatform = mock.fn(async (_env, platform) =>
      handler.syncPlatform.mock.callCount() === 0
        ? { platform, success: false, code: 'JOBKOREA_SESSION_EXPIRED', error: 'session expired' }
        : { platform, success: true }
    );
    handler.refreshJobKoreaSession = mock.fn(async () => ({
      ok: true,
      key: 'auth:jobkorea',
      length: 9,
    }));

    const response = await handler.triggerProfileSync(request({ platforms: ['jobkorea'] }));
    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(handler.refreshJobKoreaSession.mock.callCount(), 1);
    assert.equal(handler.syncPlatform.mock.callCount(), 2);
  });

  it('reports the refresh failure when an expired JobKorea session cannot be re-minted', async () => {
    const handler = new ProfileSyncHandler({ JOB_DB: fakeJobDb(STORED) });
    handler.syncPlatform = mock.fn(async (_env, platform) => ({
      platform,
      success: false,
      code: 'JOBKOREA_SESSION_EXPIRED',
      error: 'session expired',
    }));
    handler.refreshJobKoreaSession = mock.fn(async () => ({ ok: false, error: 'captcha' }));

    const body = await (
      await handler.triggerProfileSync(request({ platforms: ['jobkorea'] }))
    ).json();

    assert.equal(body.success, false);
    assert.match(
      body.platformResults.jobkorea.error,
      /session expired; JobKorea session refresh failed: captcha/
    );
    assert.equal(handler.syncPlatform.mock.callCount(), 1);
  });

  it('returns 404 when no master resume is stored', async () => {
    const handler = new ProfileSyncHandler({ JOB_DB: fakeJobDb(null) });
    handler.syncPlatform = mock.fn();

    const response = await handler.triggerProfileSync(request({}));

    assert.equal(response.status, 404);
    assert.equal(handler.syncPlatform.mock.callCount(), 0);
  });

  it('returns 503 without the JOB_DB binding', async () => {
    const response = await new ProfileSyncHandler({}).triggerProfileSync(request({}));
    assert.equal(response.status, 503);
  });
});
