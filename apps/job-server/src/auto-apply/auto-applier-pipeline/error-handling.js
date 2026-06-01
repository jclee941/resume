export async function persistFailureState(autoApplier, applicationId, error) {
  try {
    await autoApplier.repository.updateStatus(applicationId, 'failed', error.message);
    await autoApplier.tracker.recordCompletion(applicationId, 'failed', error.message);
  } catch (trackingError) {
    autoApplier.logger.error(
      `[auto-applier] failed to persist failure state (${applicationId}): ${trackingError.message}`
    );
  }
}

export async function notifyApplicationFailure(autoApplier, job, applicationId, error) {
  try {
    await autoApplier.retryService.execute(
      async () =>
        await autoApplier.notificationAdapter.sendApplicationFailed(
          job,
          applicationId,
          error,
          job.source
        ),
      { serviceName: 'telegram-notify-failure' }
    );
  } catch (notifyError) {
    autoApplier.logger.error(
      `[auto-applier] failure notification failed (${applicationId}): ${notifyError.message}`
    );
  }
}

export async function handleProcessJobError(
  autoApplier,
  job,
  jobId,
  trackedApplication,
  stageState,
  error
) {
  const applicationId = trackedApplication?.id || null;

  if (applicationId) {
    await persistFailureState(autoApplier, applicationId, error);
    await notifyApplicationFailure(autoApplier, job, applicationId, error);
  }

  autoApplier.logger.error(
    `❌ Failed to process job ${job.company}/${job.position}: ${error.message}`
  );
  return {
    success: false,
    applied: false,
    status: 'failed',
    error: error.message,
    jobId,
    applicationId,
    stages: stageState,
  };
}
