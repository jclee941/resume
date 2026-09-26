import { evaluateApplyDecision } from './approval-flow.js';
import { handleProcessJobError } from './error-handling.js';
import {
  createInitialStageState,
  getJobIdentifier,
  getJobScore,
  maybeGenerateCoverLetter,
  trackAndScoreJob,
} from './pipeline-stages.js';
import {
  createSubmittedResult,
  handleSkippedDecision,
  handleSubmissionDisabled,
  submitApprovedApplication,
} from './submission-flow.js';

/**
 * @typedef {import('./pipeline-stages.js').StageAutoApplier &
 *   import('./submission-flow.js').AutoApplier &
 *   import('./error-handling.js').AutoApplier & {
 *     config: { dryRun?: boolean; autoApply?: boolean; reviewThreshold: number };
 *     shouldApply(
 *       job: import('./approval-flow.js').ApprovalJob,
 *       trackedApplication?: import('./pipeline-stages.js').TrackedApplicationRecord | null
 *     ): Promise<import('./approval-flow.js').ShouldApplyResult>;
 *   }} ProcessJobContext
 */

/**
 * @typedef {import('./pipeline-stages.js').StageJob &
 *   import('./approval-flow.js').ApprovalJob &
 *   import('./submission-flow.js').SubmissionJob &
 *   import('./error-handling.js').PipelineJob} ProcessJobInput
 */

/**
 * @this {ProcessJobContext}
 * @param {ProcessJobInput} job
 * @param {import('./submission-flow.js').SubmissionContext} [context]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function processJob(job, context = {}) {
  const score = getJobScore(job);
  const jobId = getJobIdentifier(job);
  const stageState = createInitialStageState();

  let trackedApplication;
  let coverLetter;

  try {
    trackedApplication = await trackAndScoreJob(this, job, score, stageState);
    coverLetter = await maybeGenerateCoverLetter(this, job, score, trackedApplication, stageState);

    const applyDecision = await evaluateApplyDecision(
      this,
      job,
      score,
      trackedApplication,
      stageState
    );

    if (!applyDecision.apply) {
      return await handleSkippedDecision(
        this,
        applyDecision,
        trackedApplication,
        jobId,
        stageState
      );
    }

    if (this.config.dryRun || !this.config.autoApply) {
      return await handleSubmissionDisabled(this, trackedApplication, jobId, stageState);
    }

    const submissionResult = await submitApprovedApplication(
      this,
      job,
      trackedApplication,
      coverLetter,
      context,
      stageState
    );

    return createSubmittedResult(jobId, trackedApplication, submissionResult, stageState);
  } catch (error) {
    return await handleProcessJobError(
      this,
      job,
      jobId,
      trackedApplication,
      stageState,
      /** @type {Error} */ (error)
    );
  }
}
