import {
  attachWorkflowApproval,
  createAtsGateResult,
  createAtsSubmissionPreviews,
  evaluateAtsSubmitGate,
  hasLaterSubmitCandidate,
  safePreviewText,
  WORKFLOW_APPROVAL,
} from './application-submission-gates.js';

export { attachWorkflowApproval, WORKFLOW_APPROVAL };

/**
 * @typedef {{
 *   success?: boolean;
 *   alreadyApplied?: boolean;
 *   status?: string;
 *   error?: string | null;
 *   networkWrite?: boolean;
 *   browserRendered?: boolean;
 *   targetUrl?: string;
 *   finalUrl?: string;
 *   visibleAction?: string;
 *   requiresBrowserAutomation?: boolean;
 *   browserRequired?: boolean;
 *   requiresBrowserRendering?: boolean;
 *   [key: string]: unknown;
 * }} SubmitApplicationResult
 */

/**
 * @typedef {{
 *   logWorkflowStep(workflowId: string, stepName: string, status: string, data?: Record<string, unknown>): Promise<unknown>;
 *   generateCoverLetter(job: unknown): Promise<string>;
 *   getResume(resumeId: string): Promise<unknown>;
 *   submitApplication(params: Record<string, unknown>): Promise<SubmitApplicationResult>;
 *   recordApplication(record: Record<string, unknown>): Promise<unknown>;
 * }} ApplicationSubmissionContext
 */

/**
 * @typedef {import('cloudflare:workers').WorkflowStep} SubmissionStepContext
 */

/**
 * @param {ApplicationSubmissionContext} ctx
 * @param {SubmissionStepContext} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {import('./application-submission-gates.js').GateJob[]} approvedJobs
 * @param {string} resumeId
 * @param {boolean} dryRun
 * @param {{ explicitSubmit?: boolean; submitOptIn?: boolean }} [submitOptions]
 * @returns {Promise<unknown[]>}
 */
// prettier-ignore
export async function submitApprovedApplications(ctx, step, workflow, approvedJobs, resumeId, dryRun, submitOptions = {}) {
  const applicationResults = [];
  const jobs = Array.isArray(approvedJobs) ? approvedJobs : [];
  const submitOptIn = submitOptions?.explicitSubmit === true || submitOptions?.submitOptIn === true;

  if (!dryRun && jobs.length > 0) {
    for (const job of jobs) {
      const gate = evaluateAtsSubmitGate(job, submitOptIn);
      if (!gate.canSubmit) {
        applicationResults.push(createAtsGateResult(job, gate));
        continue;
      }

      const result = await step.do(
        `apply-job-${job.id}`,
        {
          retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
          timeout: '5 minutes',
        },
        async () => submitApprovedApplication(ctx, workflow, job, resumeId)
      );

      applicationResults.push(result);

      if (hasLaterSubmitCandidate(jobs, jobs.indexOf(job), submitOptIn)) {
        await step.sleep('pause-between-applications', '5 seconds');
      }
    }
  } else if (dryRun) {
    applicationResults.push(...createAtsSubmissionPreviews(jobs, resumeId));
    // prettier-ignore
    workflow.steps.push({ step: 'apply-jobs', status: 'dry-run', count: jobs.length, previewed: applicationResults.length, networkWrites: 0 });
  }

  /** @type {{ applied: number; failed: number; previewed: number; networkWrites?: number }} */
  const logData = {
    applied: workflow.stats.jobsApplied,
    failed: workflow.stats.jobsFailed,
    previewed: dryRun ? applicationResults.length : 0,
  };
  workflow.steps.push({ step: 'apply-jobs', status: 'completed', ...logData });
  if (dryRun) logData.networkWrites = 0;
  await ctx.logWorkflowStep(workflow.id, 'apply-jobs', 'completed', logData);

  return applicationResults;
}

/**
 * @param {ApplicationSubmissionContext} ctx
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {import('./application-submission-gates.js').GateJob} job
 * @param {string} resumeId
 * @returns {Promise<unknown>}
 */
async function submitApprovedApplication(ctx, workflow, job, resumeId) {
  try {
    const coverLetter = await ctx.generateCoverLetter(job);
    const resume = await ctx.getResume(resumeId);

    // prettier-ignore
    const submitResult = await ctx.submitApplication({
      platform: job.source,
      jobId: job.id,
      sourceUrl: job.sourceUrl || job.url,
      resume,
      coverLetter,
      job,
    });

    const record = {
      workflowId: workflow.id,
      jobId: job.id,
      platform: job.source,
      sourceUrl: job.sourceUrl || job.url || null,
      company: job.company,
      position: job.position,
      resumeId,
      coverLetter,
      matchScore: job.matchScore,
    };

    if (submitResult.alreadyApplied || submitResult.status === 'already_applied') {
      await ctx.recordApplication(record);
      return {
        success: true,
        networkWrite: false,
        action: 'already_applied',
        status: 'already_applied',
        platform: safePreviewText(job.source),
        jobId: safePreviewText(job.id),
        company: safePreviewText(job.company),
        position: safePreviewText(job.position),
      };
    }

    if (submitResult.success) {
      workflow.stats.jobsApplied++;

      await ctx.recordApplication(record);

      return { success: true, jobId: job.id, company: job.company, position: job.position };
    }

    if (requiresDeferredBrowserAction(submitResult)) {
      return {
        success: true,
        networkWrite: submitResult.networkWrite === true,
        action: submitResult.browserRendered
          ? 'browser_rendered_review_required'
          : 'handoff_required',
        status: submitResult.browserRendered ? 'rendered-review-required' : 'handoff-required',
        platform: safePreviewText(job.source),
        jobId: safePreviewText(job.id),
        company: safePreviewText(job.company),
        position: safePreviewText(job.position),
        reason: safePreviewText(submitResult.error),
        browserRendered: submitResult.browserRendered === true,
        targetUrl: safePreviewText(submitResult.targetUrl),
        finalUrl: safePreviewText(submitResult.finalUrl),
        visibleAction: safePreviewText(submitResult.visibleAction),
      };
    }

    workflow.stats.jobsFailed++;
    return createSubmitFailure(job.id, submitResult.error);
  } catch (error) {
    workflow.stats.jobsFailed++;
    return createSubmitFailure(job.id, error instanceof Error ? error.message : String(error));
  }
}

/**
 * @param {SubmitApplicationResult | null | undefined} result
 * @returns {boolean}
 */
function requiresDeferredBrowserAction(result) {
  return Boolean(
    result?.requiresBrowserAutomation === true ||
    result?.browserRequired === true ||
    result?.requiresBrowserRendering === true
  );
}

/**
 * @param {unknown} jobId
 * @param {unknown} error
 * @returns {{ success: boolean; jobId: unknown; error: unknown }}
 */
function createSubmitFailure(jobId, error) {
  return { success: false, jobId, error };
}
