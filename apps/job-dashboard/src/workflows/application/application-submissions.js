import { isAtsDryRunPlatform } from './platforms.js';

export const WORKFLOW_APPROVAL = Symbol('workflowApproval');

export function attachWorkflowApproval(job, approval) {
  return {
    ...job,
    workflowApprovalRequestId: approval.id,
    workflowApprovalStatus: approval.status,
    workflowApprovalMetadata: approval.metadata,
    [WORKFLOW_APPROVAL]: approval,
  };
}

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

function createAtsSubmissionPreviews(jobs, resumeId) {
  return jobs.filter(isPreviewableAtsJob).map((job) => ({
    success: true,
    dryRun: true,
    networkWrite: false,
    action: 'would_apply',
    status: 'dry-run',
    platform: job.source,
    jobId: safePreviewText(job.id || job.sourceId),
    company: safePreviewText(job.company),
    position: safePreviewText(job.position || job.title),
    resumeId: safePreviewText(resumeId),
  }));
}

function isPreviewableAtsJob(job) {
  return Boolean(job?.id || job?.sourceId) && isAtsDryRunPlatform(job.source);
}

function evaluateAtsSubmitGate(job, submitOptIn) {
  if (!isAtsDryRunPlatform(job?.source)) return { canSubmit: true };
  if (!hasSubmitCapability(job)) {
    return { canSubmit: false, status: 'rejected', reason: 'ATS adapter cannot submit' };
  }
  const approvalGate = evaluateHumanApprovalGate(job);
  if (!approvalGate.canSubmit) return approvalGate;
  if (!submitOptIn) {
    return {
      canSubmit: false,
      status: 'missing-opt-in',
      reason: 'Explicit ATS submit flag is required',
    };
  }
  return { canSubmit: true };
}

function hasSubmitCapability(job) {
  const capability = getWorkflowApproval(job)?.metadata?.adapterCapability;
  return Boolean(
    capability?.canSubmit === true ||
    capability?.supportsSubmit === true ||
    capability?.submitSupported === true
  );
}

function evaluateHumanApprovalGate(job) {
  const approval = getWorkflowApproval(job);
  if (approval?.status === 'pending') {
    return { canSubmit: false, status: 'pending', reason: 'ATS approval is pending' };
  }
  if (approval?.status === 'rejected') {
    return { canSubmit: false, status: 'rejected', reason: 'ATS approval was rejected' };
  }
  if (hasExplicitHumanApproval(job)) return { canSubmit: true };
  return {
    canSubmit: false,
    status: 'human-approval-required',
    reason: 'Explicit human ATS approval is required for this destination',
  };
}

function hasExplicitHumanApproval(job) {
  const approval = getWorkflowApproval(job);
  const marker = approval?.metadata?.humanApproval;
  return Boolean(
    approval?.id &&
    (approval.status === 'human-approved' || marker?.status === 'approved') &&
    marker?.destination === job?.source
  );
}

function createAtsGateResult(job, gate) {
  return {
    success: false,
    networkWrite: false,
    action: 'blocked',
    status: gate.status,
    reason: gate.reason,
    platform: safePreviewText(job?.source),
    jobId: safePreviewText(job?.id || job?.sourceId),
    company: safePreviewText(job?.company),
    position: safePreviewText(job?.position || job?.title),
  };
}

function hasLaterSubmitCandidate(jobs, index, submitOptIn) {
  return jobs.slice(index + 1).some((job) => evaluateAtsSubmitGate(job, submitOptIn).canSubmit);
}

function getWorkflowApproval(job) {
  return job?.[WORKFLOW_APPROVAL] || null;
}

function safePreviewText(value) {
  if (value == null) return '';
  return Array.from(String(value), safePreviewCharacter).join('').slice(0, 160);
}

function safePreviewCharacter(character) {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127 ? ' ' : character;
}

async function submitApprovedApplication(ctx, workflow, job, resumeId) {
  try {
    const coverLetter = await ctx.generateCoverLetter(job);
    const resume = await ctx.getResume(resumeId);

    // prettier-ignore
    const submitResult = await ctx.submitApplication({ platform: job.source, jobId: job.id, resume, coverLetter });

    if (submitResult.success) {
      workflow.stats.jobsApplied++;

      await ctx.recordApplication({
        workflowId: workflow.id,
        jobId: job.id,
        platform: job.source,
        company: job.company,
        position: job.position,
        resumeId,
        coverLetter,
        matchScore: job.matchScore,
      });

      return { success: true, jobId: job.id, company: job.company, position: job.position };
    }

    workflow.stats.jobsFailed++;
    return createSubmitFailure(job.id, submitResult.error);
  } catch (error) {
    workflow.stats.jobsFailed++;
    return createSubmitFailure(job.id, error.message);
  }
}

function createSubmitFailure(jobId, error) {
  return { success: false, jobId, error };
}
