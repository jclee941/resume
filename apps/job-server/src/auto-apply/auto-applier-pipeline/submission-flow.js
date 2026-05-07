export async function submitApplication(job) {
  return await this.retryService.execute(async () => await this.applyToJob(job), {
    serviceName: `apply-${job.source || 'unknown'}`,
  });
}

export async function handleSkippedDecision(
  autoApplier,
  applyDecision,
  trackedApplication,
  jobId,
  stageState
) {
  await autoApplier.repository.updateStatus(
    trackedApplication.id,
    applyDecision.status || 'skip',
    applyDecision.reason || 'Skipped by apply decision'
  );
  await autoApplier.tracker.recordCompletion(
    trackedApplication.id,
    applyDecision.status || 'skip',
    applyDecision.reason || 'Skipped by apply decision'
  );

  return {
    success: true,
    applied: false,
    status: applyDecision.status || 'skipped',
    reason: applyDecision.reason,
    jobId,
    applicationId: trackedApplication.id,
    stages: stageState,
  };
}

export async function handleSubmissionDisabled(autoApplier, trackedApplication, jobId, stageState) {
  const reason = autoApplier.config.dryRun ? 'Dry run - submission skipped' : 'Auto-apply disabled';

  await autoApplier.repository.updateStatus(trackedApplication.id, 'pending', reason);
  await autoApplier.tracker.recordCompletion(trackedApplication.id, 'pending', reason);

  return {
    success: true,
    applied: false,
    status: 'pending',
    reason: autoApplier.config.dryRun ? 'dry_run' : 'auto_apply_disabled',
    jobId,
    applicationId: trackedApplication.id,
    stages: stageState,
  };
}

export async function submitApprovedApplication(
  autoApplier,
  job,
  trackedApplication,
  coverLetter,
  context,
  stageState
) {
  if (typeof context.ensureBrowser === 'function') {
    await context.ensureBrowser();
  }

  stageState.submit = true;
  const submissionResult = await autoApplier.submitApplication({
    ...job,
    applicationId: trackedApplication.id,
    coverLetter,
  });

  if (!submissionResult.success) {
    throw new Error(submissionResult.error || 'Unknown submission error');
  }

  await autoApplier.tracker.recordSubmission(trackedApplication.id, {
    message: 'Application submitted successfully',
    sourceUrl: job.sourceUrl,
  });
  await autoApplier.repository.updateStatus(
    trackedApplication.id,
    'submitted',
    'Application submitted via auto-applier'
  );
  await autoApplier.tracker.recordCompletion(
    trackedApplication.id,
    'completed',
    'Submission completed'
  );

  await autoApplier.retryService.execute(
    async () =>
      await autoApplier.notificationAdapter.sendApplicationSuccess(
        job,
        trackedApplication.id,
        job.source
      ),
    { serviceName: 'telegram-notify-success' }
  );

  return submissionResult;
}

export function createSubmittedResult(jobId, trackedApplication, submissionResult, stageState) {
  return {
    success: true,
    applied: true,
    status: 'submitted',
    jobId,
    applicationId: trackedApplication.id,
    submission: submissionResult,
    stages: stageState,
  };
}
