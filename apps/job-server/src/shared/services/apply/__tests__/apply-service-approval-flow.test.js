import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { JobFilter } from '../job-filter.js';
import { ApprovalWorkflowManager } from '../approval-manager.js';
import { ApplicationTrackerService } from '../application-tracker.js';
import { TelegramNotificationAdapter } from '../../notifications/telegram-adapter.js';
import { createApplyServiceFixture } from './integration-fixtures.js';

describe('Apply service approval integration', () => {
  it('integrates JobFilter + ApprovalWorkflowManager for manual review flow', async () => {
    const { repository, logger } = createApplyServiceFixture();
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

  it('integrates TelegramNotificationAdapter callback flow', async () => {
    const { d1Client, repository, logger } = createApplyServiceFixture();
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
});
