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

export async function processJob(job, context = {}) {
  const score = getJobScore(job);
  const jobId = getJobIdentifier(job);
  const stageState = createInitialStageState();

  let trackedApplication = null;
  let coverLetter = null;

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
      return await handleSkippedDecision(this, applyDecision, trackedApplication, jobId, stageState);
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
    return await handleProcessJobError(this, job, jobId, trackedApplication, stageState, error);
  }
}
