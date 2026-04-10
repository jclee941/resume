import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

import { JobFilter } from '../job-filter.js';
import { ApprovalWorkflowManager } from '../approval-manager.js';
import { ApplicationTrackerService } from '../application-tracker.js';
import { CoverLetterService } from '../cover-letter-service.js';
import { TelegramNotificationAdapter } from '../../notifications/telegram-adapter.js';
import { applyToJob } from '../../../../auto-apply/strategies/wanted-strategy.js';
import SessionManager from '../../session/session-manager.js';
import { notifications } from '../../notifications/index.js';
import { ApplicationRepository } from '../../../repositories/application-repository.js';

class InMemoryD1Client {
  constructor() {
    this.db = new Database(':memory:');
    this.#createSchema();
  }

  async query(sql, params = []) {
    const statement = this.db.prepare(sql);
    const normalized = sql.trim().toUpperCase();

    if (
      normalized.startsWith('SELECT') ||
      normalized.startsWith('WITH') ||
      normalized.startsWith('PRAGMA')
    ) {
      return statement.all(...params);
    }

    statement.run(...params);
    return [];
  }

  #createSchema() {
    this.db.exec(`
      CREATE TABLE applications (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        source TEXT,
        source_url TEXT,
        position TEXT,
        company TEXT,
        location TEXT,
        match_score INTEGER,
        status TEXT,
        priority TEXT,
        resume_id TEXT,
        cover_letter TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        applied_at TEXT,
        workflow_id TEXT,
        approved_at TEXT,
        rejected_at TEXT
      );

      CREATE TABLE application_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT,
        status TEXT,
        previous_status TEXT,
        note TEXT,
        timestamp TEXT
      );

      CREATE TABLE approval_requests (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        job_id TEXT,
        job_title TEXT,
        company TEXT,
        platform TEXT,
        match_score INTEGER,
        status TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE notification_history (
        id TEXT PRIMARY KEY,
        event_type TEXT,
        data TEXT,
        channels TEXT,
        timestamp TEXT,
        status TEXT,
        results TEXT
      );
    `);
  }
}

function createLogger() {
  return {
    info: mock.fn(),
    log: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
  };
}

async function getTimeline(d1Client, applicationId) {
  return d1Client.query(
    `
      SELECT status, previous_status, note
      FROM application_timeline
      WHERE application_id = ?
      ORDER BY id ASC
    `,
    [applicationId]
  );
}

afterEach(() => {
  mock.restoreAll();
});

describe('Apply service integration', () => {
  let d1Client;
  let repository;
  let logger;

  beforeEach(() => {
    d1Client = new InMemoryD1Client();
    repository = new ApplicationRepository(d1Client);
    logger = createLogger();
  });

  it('1) integrates JobFilter + ApprovalWorkflowManager for manual review flow', async () => {
    const notificationAdapter = {
      sendApprovalRequest: mock.fn(async () => ({ sent: true, channel: 'telegram' })),
    };

    const tracker = new ApplicationTrackerService({
      applicationRepository: repository,
      logger,
    });
    const approvalManager = new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter,
      logger,
    });
    const filter = new JobFilter({
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      platformPriority: ['wanted'],
      logger,
    });

    const job = {
      id: 'job-review-1',
      source: 'wanted',
      company: 'Review Corp',
      position: 'DevOps Engineer',
      matchScore: 62,
    };

    const tracked = await tracker.startTracking(job, 62);
    const filtered = await filter.filter([job], new Set(), { useAI: false });
    const scoredJob = filtered.jobs[0];

    assert.ok(scoredJob.matchScore >= 60 && scoredJob.matchScore <= 74);

    const requestResult = await approvalManager.requestApproval(
      { ...job, applicationId: tracked.id },
      scoredJob.matchScore
    );

    assert.equal(notificationAdapter.sendApprovalRequest.mock.calls.length, 1);
    assert.equal(requestResult.status, 'pending');

    const pendingApp = await repository.findById(tracked.id);
    assert.equal(pendingApp.status, 'pending');

    const pendingStatus = await approvalManager.checkApprovalStatus(tracked.id);
    assert.equal(pendingStatus.pending, true);

    await approvalManager.approve(tracked.id, 'reviewer-1');

    const approvedApp = await repository.findById(tracked.id);
    assert.equal(approvedApp.status, 'can_apply');

    const approvedStatus = await approvalManager.checkApprovalStatus(tracked.id);
    assert.equal(approvedStatus.status, 'approved');
    assert.equal(approvedStatus.pending, false);
  });

  it('2) integrates CoverLetterService + ApplicationTrackerService with D1 timeline and cache', async () => {
    const coverLetterGenerator = mock.fn(async () => ({
      coverLetter: 'Generated cover letter body',
      fallback: false,
    }));

    const coverLetterService = new CoverLetterService({
      generator: coverLetterGenerator,
      d1Client,
      resumeData: { personal: { name: 'Tester' } },
      logger,
    });

    const tracker = new ApplicationTrackerService({
      applicationRepository: repository,
      coverLetterService,
      logger,
    });

    const job = {
      id: 'job-cover-1',
      source: 'wanted',
      company: 'Cover Corp',
      position: 'Platform Engineer',
    };

    const tracked = await tracker.startTracking(job, 80);

    const first = await coverLetterService.generate(job, {
      cacheEnabled: true,
      useAI: false,
    });
    assert.equal(first.cached, false);

    await tracker.recordCoverLetter(job.id, first.coverLetter);

    const second = await coverLetterService.generate(job, {
      cacheEnabled: true,
      useAI: false,
    });
    assert.equal(second.cached, true);
    assert.equal(coverLetterGenerator.mock.calls.length, 1);

    const updated = await repository.findById(tracked.id);
    assert.equal(updated.cover_letter, 'Generated cover letter body');

    const trackedView = await tracker.getApplication(tracked.id);
    assert.ok(trackedView.timeline.some((entry) => entry.status === 'cover_letter_generated'));

    const failingCoverLetterService = new CoverLetterService({
      generator: async () => {
        throw new Error('LLM generation failed');
      },
      d1Client,
      resumeData: { personal: { name: 'Tester' } },
      logger,
    });

    const failedJob = {
      id: 'job-cover-fail-1',
      source: 'wanted',
      company: 'Fail Corp',
      position: 'SRE',
    };

    const failedTracked = await tracker.startTracking(failedJob, 70);
    try {
      await failingCoverLetterService.generate(failedJob, { cacheEnabled: false });
      assert.fail('Expected cover letter generation to fail');
    } catch (error) {
      await tracker.recordCompletion(
        failedTracked.id,
        'failed',
        `Cover letter generation failed: ${error.message}`
      );
    }

    const failedTimeline = await getTimeline(d1Client, failedTracked.id);
    assert.ok(failedTimeline.some((entry) => entry.status === 'failed'));
    assert.ok(
      failedTimeline.some((entry) => String(entry.note).includes('Cover letter generation failed'))
    );
  });

  it('4) integrates TelegramNotificationAdapter + ApprovalWorkflowManager callback flow', async () => {
    const fetchCalls = [];
    mock.method(globalThis, 'fetch', async (url, init = {}) => {
      fetchCalls.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ ok: true }),
      };
    });

    const telegramAdapter = new TelegramNotificationAdapter({
      telegramToken: 'test-token',
      telegramChatId: 'test-chat',
      d1Client,
      logger,
    });

    const tracker = new ApplicationTrackerService({
      applicationRepository: repository,
      logger,
    });
    const approvalManager = new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter: telegramAdapter,
      logger,
    });

    const job = {
      id: 'job-telegram-1',
      source: 'wanted',
      company: 'Telegram Corp',
      position: 'Backend Engineer',
    };

    const tracked = await tracker.startTracking(job, 70);
    await approvalManager.requestApproval({ ...job, applicationId: tracked.id }, 70);

    const sendMessageCall = fetchCalls.find((call) => call.url.includes('/sendMessage'));
    assert.ok(sendMessageCall);
    const messagePayload = JSON.parse(sendMessageCall.init.body);
    const callbackButtons = messagePayload.reply_markup.inline_keyboard.flat();
    assert.ok(callbackButtons.some((btn) => btn.callback_data === `approve:${tracked.id}`));
    assert.ok(callbackButtons.some((btn) => btn.callback_data === `reject:${tracked.id}`));

    const callbackResult = await telegramAdapter.handleCallbackQuery(
      { id: 'callback-1', data: `approve:${tracked.id}` },
      {
        onApprove: async (applicationId) =>
          approvalManager.approve(applicationId, 'telegram-reviewer'),
      }
    );

    assert.equal(callbackResult.handled, true);
    assert.equal(callbackResult.action, 'approve');

    const approvedApp = await repository.findById(tracked.id);
    assert.equal(approvedApp.status, 'can_apply');

    const historyRows = await d1Client.query(
      'SELECT event_type, status FROM notification_history ORDER BY timestamp ASC'
    );

    assert.ok(historyRows.some((row) => row.event_type === 'approval_required'));
    assert.ok(historyRows.some((row) => row.event_type === 'approval_callback'));
  });

  it('5) full pipeline integration keeps D1 state consistent across services', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ ok: true }),
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

    mock.method(notifications, 'notifyApplySuccess', async () => ({ sent: true }));
    mock.method(notifications, 'notifyApplyFailed', async () => ({ sent: true }));

    const api = {
      getProfile: async () => ({ ok: true }),
      getApplications: async () => ({ applications: [] }),
      getResumes: async () => ({ resumes: [{ id: 'resume-1' }] }),
      chaosRequest: async () => ({ application_id: 'wanted-application-99' }),
    };

    mock.method(SessionManager, 'load', () => ({ cookieString: 'sid=ok', timestamp: Date.now() }));
    mock.method(SessionManager, 'getAPI', async () => api);

    const job = {
      id: 'job-pipeline-1',
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

    const wantedContext = {
      config: { delayBetweenApps: 0 },
      logger,
      statsService: { recordApplyRetryMetric: mock.fn() },
      appManager: {
        addApplication: mock.fn(() => ({ id: tracked.id })),
        updateStatus: mock.fn((applicationId, status, note) => {
          d1Client.db
            .prepare(
              `
                UPDATE applications
                SET status = ?, notes = ?, updated_at = datetime('now')
                WHERE id = ?
              `
            )
            .run(status, note || null, applicationId);
        }),
        recordRetryMetric: mock.fn(),
      },
    };

    const applyResult = await applyToJob.call(wantedContext, job, {
      coverLetter: coverLetter.coverLetter,
      delayBetweenSubmissionsMs: 0,
    });

    assert.equal(applyResult.success, true);
    assert.equal(applyResult.applicationId, 'wanted-application-99');

    const finalApp = await repository.findById(tracked.id);
    assert.equal(finalApp.status, 'applied');
    assert.equal(finalApp.cover_letter, 'Pipeline cover letter');

    const approvalRequest = await d1Client.query(
      'SELECT status FROM approval_requests WHERE id = ?',
      [tracked.id]
    );
    assert.equal(approvalRequest[0].status, 'approved');

    const timeline = await getTimeline(d1Client, tracked.id);
    const timelineStatuses = timeline.map((entry) => entry.status);
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

  it('3) integrates RetryService behavior through Wanted strategy failures and open circuit fallback', async () => {
    let chaosRequestCalls = 0;
    let mode = 'retry-once';

    const api = {
      getProfile: async () => ({ ok: true }),
      getApplications: async () => ({ applications: [] }),
      getResumes: async () => ({ resumes: [{ id: 'resume-1' }] }),
      chaosRequest: async () => {
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

    mock.method(SessionManager, 'load', () => ({ cookieString: 'sid=ok', timestamp: Date.now() }));
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
      id: 'job-wanted-failure-1',
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
        { ...job, id: `job-wanted-failure-${idx + 2}` },
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
