import { getJobScore } from './pipeline-stages.js';

export async function shouldApply(job, trackedApplication = null) {
  const score = getJobScore(job);
  const jobId = job.id ?? job.job_id ?? null;

  if (!Number.isFinite(score) || score < this.config.reviewThreshold) {
    return {
      apply: false,
      status: 'skip',
      reason: `Score below threshold (${score} < ${this.config.reviewThreshold})`,
    };
  }

  if (jobId && this.appManager.isDuplicate(jobId)) {
    return { apply: false, status: 'skip', reason: 'Duplicate job in local manager' };
  }

  if (jobId) {
    const existing = await this.repository.findByJobId(String(jobId));
    const alreadySubmitted = existing.some((app) =>
      ['submitted', 'applied', 'completed', 'approved', 'can_apply'].includes(app.status)
    );
    if (alreadySubmitted) {
      return { apply: false, status: 'skip', reason: 'Duplicate job in repository' };
    }
  }

  if (score >= this.config.autoApplyThreshold) {
    return { apply: true, status: 'can_apply', reason: 'Auto-apply threshold met' };
  }

  const approvalResult = await this.handleApproval(job, trackedApplication);
  if (!approvalResult.approved) {
    return {
      apply: false,
      status: approvalResult.status,
      reason: approvalResult.reason,
    };
  }

  return {
    apply: true,
    status: 'can_apply',
    reason: 'Approved by manual workflow',
  };
}

export async function handleApproval(job, trackedApplication = null) {
  const score = getJobScore(job);
  if (score < this.config.reviewThreshold || score >= this.config.autoApplyThreshold) {
    return {
      approved: true,
      status: 'can_apply',
      reason: 'Approval not required for this score tier',
    };
  }

  const applicationId = trackedApplication?.id || job.applicationId;
  if (!applicationId) {
    return {
      approved: false,
      status: 'failed',
      reason: 'Missing application ID for approval workflow',
    };
  }

  await this.tracker.recordApprovalRequest(applicationId);
  await this.approvalManager.requestApproval(
    {
      ...job,
      applicationId,
    },
    score
  );

  const status = await this.approvalManager.checkApprovalStatus(applicationId);

  if (status.status === 'approved') {
    await this.tracker.recordApproval(applicationId, true, status.reviewedBy || 'reviewer');
    return {
      approved: true,
      status: 'approved',
      reason: 'Approval granted',
    };
  }

  if (status.status === 'rejected' || status.status === 'timeout') {
    await this.tracker.recordApproval(applicationId, false, status.reviewedBy || 'reviewer');
    return {
      approved: false,
      status: 'rejected',
      reason: status.notes?.reason || 'Approval rejected',
    };
  }

  return {
    approved: false,
    status: 'pending',
    reason: 'Awaiting manual approval',
  };
}

export async function evaluateApplyDecision(autoApplier, job, score, trackedApplication, stageState) {
  stageState.checkApproval = true;
  return await autoApplier.shouldApply(
    {
      ...job,
      matchScore: score,
    },
    trackedApplication
  );
}
