export async function processApprovalGates(
  ctx,
  step,
  workflow,
  scoredJobs,
  autoApprove,
  autoApproveThreshold
) {
  const approvedJobs = [];
  const approvalResults = [];

  for (const job of scoredJobs) {
    const approvalResult = await step.do(
      `approval-gate-${job.id}`,
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => evaluateApproval(ctx, step, workflow, job, autoApprove, autoApproveThreshold)
    );

    approvalResults.push(approvalResult);

    if (approvalResult.status === 'approved' || approvalResult.status === 'auto-approved') {
      approvedJobs.push(approvalResult.job);
      workflow.stats.jobsApproved++;
    } else if (approvalResult.status === 'rejected') {
      workflow.stats.jobsRejected++;
    }
  }

  workflow.steps.push({
    step: 'approval-gate',
    status: 'completed',
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
  });
  await ctx.logWorkflowStep(workflow.id, 'approval-gate', 'completed', {
    approved: workflow.stats.jobsApproved,
    rejected: workflow.stats.jobsRejected,
  });

  return { approvedJobs, approvalResults };
}

async function evaluateApproval(ctx, step, workflow, job, autoApprove, autoApproveThreshold) {
  const existing = await ctx.env.JOB_DB.prepare(
    'SELECT id FROM applications WHERE job_id = ? AND source = ?'
  )
    .bind(job.id, job.source)
    .first();

  if (existing) {
    return { status: 'already-applied', job };
  }

  if (autoApprove && job.matchScore >= autoApproveThreshold) {
    await ctx.createApprovalRequest(workflow.id, job, 'auto-approved', job.matchScore);
    return { status: 'auto-approved', job };
  }

  if (job.matchScore >= 75) {
    await ctx.createApprovalRequest(workflow.id, job, 'approved', job.matchScore);
    return { status: 'approved', job };
  }

  if (job.matchScore >= 60) {
    const requestId = await ctx.createApprovalRequest(workflow.id, job, 'pending', job.matchScore);
    await ctx.sendApprovalRequestNotification(workflow.id, requestId, job);
    await step.sleep(`wait-approval-${job.id}`, '24 hours');
    const approvalStatus = await ctx.getApprovalStatus(requestId);
    return { status: approvalStatus, job, requestId };
  }

  await ctx.createApprovalRequest(workflow.id, job, 'rejected', job.matchScore);
  return { status: 'rejected', job, reason: 'Match score below threshold' };
}
