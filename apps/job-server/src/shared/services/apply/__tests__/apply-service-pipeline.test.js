import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { JobFilter } from '../job-filter.js';
import { ApprovalWorkflowManager } from '../approval-manager.js';
import { ApplicationTrackerService } from '../application-tracker.js';
import { CoverLetterService } from '../cover-letter-service.js';
import { TelegramNotificationAdapter } from '../../notifications/telegram-adapter.js';
import {
  applyToJob,
  resetCircuitState,
} from '../../../../auto-apply/strategies/wanted-strategy.js';
import SessionManager from '../../session/session-manager.js';
import { notifications } from '../../notifications/index.js';
import { createApplyServiceFixture, getTimeline } from './integration-fixtures.js';

describe('Apply service pipeline integration', () => {
  it('keeps D1 state consistent across services', async () => {
    resetCircuitState();
    const { d1Client, repository, logger } = createApplyServiceFixture();
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ ok: true }),
    }));
    mock.method(notifications, 'notifyApplySuccess', async () => ({ sent: true }));
    mock.method(notifications, 'notifyApplyFailed', async () => ({ sent: true }));
    mock.method(SessionManager, 'load', () => ({
      cookieString: 'sid=ok',
      timestamp: Date.now(),
      email: 'test@example.com',
      username: 'Pipeline Tester',
      mobile: '010-0000-0000',
    }));
    mock.method(SessionManager, 'getAPI', async () => ({
      getProfile: async () => ({ ok: true }),
      getApplications: async () => ({ applications: [] }),
      chaosRequest: async (path) => {
        if (path && path.startsWith('/resumes/v1')) {
          return { data: [{ key: 'resume-1', id: 'resume-1', is_default: true }] };
        }
        return { application_id: 'wanted-application-99' };
      },
    }));

    const telegramAdapter = new TelegramNotificationAdapter({
      telegramToken: 'token',
      telegramChatId: 'chat',
      d1Client,
      logger,
    });
    const approvalManager = new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter: telegramAdapter,
      logger,
    });
    const tracker = new ApplicationTrackerService({
      applicationRepository: repository,
      logger,
    });
    const filter = new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: ['wanted'],
      logger,
    });
    const coverLetterService = new CoverLetterService({
      generator: async () => ({
        coverLetter: 'Pipeline cover letter',
        fallback: false,
      }),
      d1Client,
      resumeData: { personal: { name: 'Pipeline Tester' } },
      logger,
    });
    const job = {
      id: 'wanted_1001',
      source: 'wanted',
      company: 'Pipeline Corp',
      position: 'DevOps Engineer',
      title: 'DevOps Engineer',
      sourceUrl: 'https://wanted.co.kr/jobs/1',
      matchScore: 72,
    };

    const tracked = await tracker.startTracking(job, 72);
    const filtered = await filter.filter([job], new Set(), { useAI: false });
    const scored = filtered.jobs[0];
    assert.ok(scored.matchScore >= 60 && scored.matchScore <= 74);

    await approvalManager.requestApproval({ ...job, applicationId: tracked.id }, scored.matchScore);
    await telegramAdapter.handleCallbackQuery(
      { id: 'pipeline-callback', data: `approve:${tracked.id}` },
      {
        onApprove: async (applicationId) =>
          approvalManager.approve(applicationId, 'pipeline-reviewer'),
      }
    );

    const coverLetter = await coverLetterService.generate(job, {
      cacheEnabled: true,
      useAI: false,
    });
    await tracker.recordCoverLetter(job.id, coverLetter.coverLetter);

    const applyResult = await applyToJob.call(
      {
        config: { delayBetweenApps: 0 },
        logger,
        statsService: { recordApplyRetryMetric: mock.fn() },
        appManager: {
          addApplication: mock.fn(() => ({ id: tracked.id })),
          updateStatus: mock.fn((applicationId, status, note) => {
            const prev = d1Client.db
              .prepare('SELECT status FROM applications WHERE id = ?')
              .get(applicationId);
            d1Client.db
              .prepare(
                "UPDATE applications SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
              )
              .run(status, note || null, applicationId);
            d1Client.db
              .prepare(
                "INSERT INTO application_timeline (application_id, status, previous_status, note, timestamp) VALUES (?, ?, ?, ?, datetime('now'))"
              )
              .run(applicationId, status, prev?.status ?? null, note || null);
          }),
          recordRetryMetric: mock.fn(),
        },
      },
      job,
      { coverLetter: coverLetter.coverLetter, delayBetweenSubmissionsMs: 0 }
    );

    assert.equal(applyResult.success, true, JSON.stringify(applyResult));
    assert.equal(applyResult.applicationId, 'wanted-application-99');

    const finalApp = await repository.findById(tracked.id);
    assert.equal(finalApp.status, 'applied');
    assert.equal(finalApp.cover_letter, 'Pipeline cover letter');

    const approvalRequest = await d1Client.query(
      'SELECT status FROM approval_requests WHERE id = ?',
      [tracked.id]
    );
    assert.equal(approvalRequest[0].status, 'approved');

    const timelineStatuses = (await getTimeline(d1Client, tracked.id)).map((entry) => entry.status);
    assert.ok(timelineStatuses.includes('pending'));
    assert.ok(timelineStatuses.includes('can_apply'));
    assert.ok(timelineStatuses.includes('cover_letter_generated'));
    assert.ok(timelineStatuses.includes('applied'));

    const notificationEvents = await d1Client.query(
      'SELECT event_type FROM notification_history ORDER BY timestamp ASC'
    );
    assert.ok(notificationEvents.some((row) => row.event_type === 'approval_required'));
    assert.ok(notificationEvents.some((row) => row.event_type === 'approval_callback'));
  });
});
