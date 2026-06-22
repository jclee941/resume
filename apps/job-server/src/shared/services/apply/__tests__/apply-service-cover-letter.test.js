import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ApplicationTrackerService } from '../application-tracker.js';
import { CoverLetterService } from '../cover-letter-service.js';
import { createApplyServiceFixture, getTimeline } from './integration-fixtures.js';

describe('Apply service cover letter integration', () => {
  it('integrates CoverLetterService + ApplicationTrackerService with D1 timeline and cache', async () => {
    const { d1Client, repository, logger } = createApplyServiceFixture();
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
});
