import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyToJob,
  resetCircuitState,
} from '../../../../auto-apply/strategies/wanted-strategy.js';
import SessionManager from '../../session/session-manager.js';
import { notifications } from '../../notifications/index.js';
import { createApplyServiceFixture } from './integration-fixtures.js';

describe('Apply service Wanted retry integration', () => {
  it('integrates RetryService behavior through Wanted strategy failures and open circuit fallback', async () => {
    resetCircuitState();
    const { logger } = createApplyServiceFixture();
    let chaosRequestCalls = 0;
    let mode = 'retry-once';
    const api = {
      getProfile: async () => ({ ok: true }),
      getApplications: async () => ({ applications: [] }),
      chaosRequest: async (path) => {
        if (path && path.startsWith('/resumes/v1')) {
          return { data: [{ key: 'resume-1', id: 'resume-1', is_default: true }] };
        }
        chaosRequestCalls += 1;
        if (mode === 'retry-once') {
          if (chaosRequestCalls === 1) {
            throw Object.assign(new Error('Gateway timeout from Wanted'), { status: 503 });
          }
          return { application_id: 'retry-success-id' };
        }
        throw Object.assign(new Error('Bad request (non-retryable)'), { status: 400 });
      },
    };

    mock.method(SessionManager, 'load', () => ({
      cookieString: 'sid=ok',
      timestamp: Date.now(),
      email: 'test@example.com',
      username: 'Test User',
      mobile: '010-0000-0000',
    }));
    mock.method(SessionManager, 'getAPI', async () => api);
    mock.method(notifications, 'notifyApplySuccess', async () => ({ sent: true }));
    mock.method(notifications, 'notifyApplyFailed', async () => ({ sent: true }));

    const statsService = { recordApplyRetryMetric: mock.fn() };
    const appManager = {
      addApplication: mock.fn(() => ({ id: 'app-failure' })),
      updateStatus: mock.fn(),
      recordRetryMetric: mock.fn(),
    };
    const wantedContext = {
      config: { delayBetweenApps: 0 },
      logger,
      statsService,
      appManager,
    };
    const job = {
      id: 'wanted_2001',
      source: 'wanted',
      company: 'Failure Corp',
      title: 'Site Reliability Engineer',
      sourceUrl: 'https://wanted.co.kr/jobs/failure-1',
    };

    const firstAttempt = await applyToJob.call(wantedContext, job, {
      coverLetter: 'First attempt',
      delayBetweenSubmissionsMs: 0,
    });
    assert.equal(firstAttempt.success, true);
    assert.equal(firstAttempt.applicationId, 'retry-success-id');
    assert.equal(statsService.recordApplyRetryMetric.mock.calls.length >= 1, true);
    assert.equal(appManager.recordRetryMetric.mock.calls.length >= 1, true);

    mode = 'force-circuit-open';
    let circuitResult = null;
    for (let idx = 0; idx < 8; idx += 1) {
      const result = await applyToJob.call(
        wantedContext,
        { ...job, id: `wanted_${idx + 2002}` },
        {
          coverLetter: `Failure attempt ${idx + 1}`,
          delayBetweenSubmissionsMs: 0,
        }
      );
      if (/circuit is open/i.test(result.error || '')) {
        circuitResult = result;
        break;
      }
    }

    assert.ok(circuitResult);
    assert.equal(circuitResult.success, false);
    assert.equal(circuitResult.retryable, false);
    assert.match(circuitResult.error, /circuit is open/i);
    assert.ok(chaosRequestCalls >= 6);
  });
});
