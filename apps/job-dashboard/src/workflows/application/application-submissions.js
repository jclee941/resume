export async function submitApprovedApplications(
  ctx,
  step,
  workflow,
  approvedJobs,
  resumeId,
  dryRun
) {
  const applicationResults = [];

  if (!dryRun && approvedJobs.length > 0) {
    for (const job of approvedJobs) {
      const result = await step.do(
        `apply-job-${job.id}`,
        {
          retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
          timeout: '5 minutes',
        },
        async () => submitApprovedApplication(ctx, workflow, job, resumeId)
      );

      applicationResults.push(result);

      if (approvedJobs.indexOf(job) < approvedJobs.length - 1) {
        await step.sleep('pause-between-applications', '5 seconds');
      }
    }
  } else if (dryRun) {
    workflow.steps.push({ step: 'apply-jobs', status: 'dry-run', count: approvedJobs.length });
  }

  workflow.steps.push({
    step: 'apply-jobs',
    status: 'completed',
    applied: workflow.stats.jobsApplied,
    failed: workflow.stats.jobsFailed,
  });
  await ctx.logWorkflowStep(workflow.id, 'apply-jobs', 'completed', {
    applied: workflow.stats.jobsApplied,
    failed: workflow.stats.jobsFailed,
  });

  return applicationResults;
}

async function submitApprovedApplication(ctx, workflow, job, resumeId) {
  try {
    const coverLetter = await ctx.generateCoverLetter(job);
    const resume = await ctx.getResume(resumeId);

    const submitResult = await ctx.submitApplication({
      platform: job.source,
      jobId: job.id,
      resume,
      coverLetter,
    });

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

      return {
        success: true,
        jobId: job.id,
        company: job.company,
        position: job.position,
      };
    }

    workflow.stats.jobsFailed++;
    return {
      success: false,
      jobId: job.id,
      error: submitResult.error,
    };
  } catch (error) {
    workflow.stats.jobsFailed++;
    return {
      success: false,
      jobId: job.id,
      error: error.message,
    };
  }
}
