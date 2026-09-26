/**
 * @typedef {{
 *   company?: string;
 *   position?: string;
 *   source?: string;
 *   [key: string]: unknown;
 * }} PipelineJob
 */

/**
 * @typedef {{
 *   repository: { updateStatus(id: string, status: string, error?: string): Promise<unknown> };
 *   tracker: { recordCompletion(id: string, status: string, error?: string): Promise<unknown> };
 *   logger: { error(msg: string): void };
 *   retryService: { execute(fn: () => Promise<unknown>, options?: { serviceName?: string }): Promise<unknown> };
 *   notificationAdapter: { sendApplicationFailed(job: PipelineJob, id: string, error: Error, source?: string): Promise<unknown> };
 * }} AutoApplier
 */

/**
 * @typedef {{
 *   id?: string | null;
 * }} TrackedApplication
 */

/**
 * @param {AutoApplier} autoApplier
 * @param {string} applicationId
 * @param {Error} error
 * @returns {Promise<void>}
 */
async function persistFailureState(autoApplier, applicationId, error) {
  try {
    await autoApplier.repository.updateStatus(applicationId, 'failed', error.message);
    await autoApplier.tracker.recordCompletion(applicationId, 'failed', error.message);
  } catch (trackingError) {
    autoApplier.logger.error(
      `[auto-applier] failed to persist failure state (${applicationId}): ${trackingError instanceof Error ? trackingError.message : String(trackingError)}`
    );
  }
}

/**
 * @param {AutoApplier} autoApplier
 * @param {PipelineJob} job
 * @param {string} applicationId
 * @param {Error} error
 * @returns {Promise<void>}
 */
async function notifyApplicationFailure(autoApplier, job, applicationId, error) {
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
      `[auto-applier] failure notification failed (${applicationId}): ${notifyError instanceof Error ? notifyError.message : String(notifyError)}`
    );
  }
}

/**
 * @param {AutoApplier} autoApplier
 * @param {PipelineJob} job
 * @param {string} jobId
 * @param {TrackedApplication | null | undefined} trackedApplication
 * @param {Record<string, unknown>} stageState
 * @param {Error} error
 * @returns {Promise<{
 *   success: boolean;
 *   applied: boolean;
 *   status: string;
 *   error: string;
 *   jobId: string;
 *   applicationId: string | null;
 *   stages: Record<string, unknown>;
 * }>}
 */
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
