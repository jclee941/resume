import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ApplyOrchestrator } from '../orchestrator.js';

describe('ApplyOrchestrator title fallback logging', () => {
  it('uses title fallback in logs and works without appManager', async () => {
    const logger = {
      log: mock.fn(),
      error: mock.fn(),
    };
    let callNumber = 0;
    const applier = {
      initBrowser: mock.fn(async () => {}),
      closeBrowser: mock.fn(async () => {}),
      applyToJob: mock.fn(async () => {
        callNumber += 1;
        if (callNumber === 1) return { success: true };
        if (callNumber === 2) return { success: false, error: 'apply failed' };
        throw new Error('apply exception');
      }),
    };
    const orchestrator = new ApplyOrchestrator({ search: mock.fn(async () => []) }, applier, null, {
      logger,
      delayBetweenApplies: 0,
      maxDailyApplications: 3,
    });

    await orchestrator.applyToJobs(
      [
        { title: 'Title Success', source: 'wanted', sourceUrl: 'https://s' },
        { title: 'Title Fail', source: 'wanted', sourceUrl: 'https://f' },
        { title: 'Title Exception', source: 'wanted', sourceUrl: 'https://e' },
      ],
      false
    );

    const logMessages = logger.log.mock.calls.map((entry) => entry.arguments[0]);
    const errorMessages = logger.error.mock.calls.map((entry) => entry.arguments[0]);

    assert.ok(logMessages.some((msg) => msg.includes('Title Success')));
    assert.ok(errorMessages.some((msg) => msg.includes('Title Fail')));
    assert.ok(errorMessages.some((msg) => msg.includes('Title Exception')));
  });
});
