import { calculateMatchScore } from '../../handlers/auto-apply/match-scoring.js';
import { NotificationService, escapeHtml } from '../../services/notifications.js';

function createWorkflowRecord(event, triggerType) {
  return {
    id: event.instanceId,
    triggerType,
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: [],
    stats: {
      jobsFound: 0,
      jobsScored: 0,
      jobsApproved: 0,
      jobsRejected: 0,
      jobsApplied: 0,
      jobsFailed: 0,
    },
    errors: [],
  };
}

async function notifyNoJobs(notificationService, triggerType, platforms) {
  await notificationService.sendTelegramNotification({
    text:
      '🔍 <b>Application Workflow Complete</b>\n\n' +
      `<b>Trigger</b>: ${triggerType}\n` +
      `<b>Platforms</b>: ${platforms.join(', ')}\n` +
      '<b>Result</b>: No jobs found matching criteria',
  });
}

function averageScore(scoredJobs) {
  return scoredJobs.reduce((sum, job) => sum + job.matchScore, 0) / scoredJobs.length || 0;
}

function topApprovedJobs(approvedJobs) {
  return (
    approvedJobs
      .slice(0, 5)
      .map(
        (job) => `  • ${escapeHtml(job.company)} - ${escapeHtml(job.position)} (${job.matchScore}%)`
      )
      .join('\n') || 'None'
  );
}

export async function runApplicationWorkflow(ctx, event, step) {
  const {
    triggerType = 'manual',
    platforms = ['wanted'],
    searchCriteria = {},
    resumeId = 'default',
    autoApprove = false,
    autoApproveThreshold = 75,
    minMatchScore = 60,
    maxDailyApplications = 10,
    dryRun = false,
    _eventData = {},
  } = event.payload;

  const workflow = createWorkflowRecord(event, triggerType);
  const notificationService = new NotificationService(ctx.env);

  await step.do(
    'initialize-workflow',
    {
      retries: { limit: 3, delay: '5 seconds' },
      timeout: '30 seconds',
    },
    async () => {
      await ctx.saveWorkflowState(workflow);
      await ctx.logWorkflowStep(workflow.id, 'initialize', 'completed', { triggerType, platforms });
      return { initialized: true };
    }
  );
  workflow.steps.push({ step: 'initialize', status: 'completed' });

  const dailyCheck = await step.do(
    'check-daily-limits',
    {
      retries: { limit: 2, delay: '5 seconds' },
      timeout: '30 seconds',
    },
    async () => {
      const today = new Date().toISOString().split('T')[0];
      const count = await ctx.getDailyApplicationCount(today);
      const remaining = Math.max(0, maxDailyApplications - count);

      if (remaining === 0) {
        throw new Error(`Daily application limit (${maxDailyApplications}) reached for ${today}`);
      }

      return { remaining, alreadyApplied: count };
    }
  );
  workflow.steps.push({
    step: 'check-daily-limits',
    status: 'completed',
    remaining: dailyCheck.remaining,
  });

  const jobsFound = await step.do(
    'search-jobs',
    {
      retries: { limit: 2, delay: '10 seconds', backoff: 'exponential' },
      timeout: '5 minutes',
    },
    async () => {
      const allJobs = [];

      for (const platform of platforms) {
        try {
          const platformJobs = await ctx.searchJobs(platform, searchCriteria);
          allJobs.push(...platformJobs.map((job) => ({ ...job, source: platform })));

          if (platforms.indexOf(platform) < platforms.length - 1) {
            await step.sleep(`pause-after-${platform}`, '10 seconds');
          }
        } catch (error) {
          workflow.errors.push({ platform, error: error.message });
          console.error(`Failed to search ${platform}:`, error.message);
        }
      }

      return allJobs;
    }
  );

  workflow.stats.jobsFound = jobsFound.length;
  workflow.steps.push({ step: 'search-jobs', status: 'completed', count: jobsFound.length });
  await ctx.logWorkflowStep(workflow.id, 'search-jobs', 'completed', { count: jobsFound.length });

  if (jobsFound.length === 0) {
    workflow.status = 'completed';
    workflow.completedAt = new Date().toISOString();
    workflow.steps.push({ step: 'complete', status: 'no-jobs-found' });
    await ctx.saveWorkflowState(workflow);

    await step.do(
      'notify-no-jobs',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        await notifyNoJobs(notificationService, triggerType, platforms);
        return { notified: true };
      }
    );

    return {
      success: true,
      workflow,
      message: 'No jobs found',
    };
  }

  const scoredJobs = await step.do(
    'score-jobs',
    {
      retries: { limit: 2, delay: '5 seconds' },
      timeout: '2 minutes',
    },
    async () => {
      const config = await ctx.getMatchingConfig();

      return jobsFound
        .map((job) => ({
          ...job,
          matchScore: calculateMatchScore(job, config),
        }))
        .filter((job) => job.matchScore >= minMatchScore)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, dailyCheck.remaining);
    }
  );

  workflow.stats.jobsScored = scoredJobs.length;
  workflow.steps.push({ step: 'score-jobs', status: 'completed', count: scoredJobs.length });
  await ctx.logWorkflowStep(workflow.id, 'score-jobs', 'completed', {
    count: scoredJobs.length,
    averageScore: averageScore(scoredJobs),
  });

  const approvedJobs = [];
  const approvalResults = [];

  for (const job of scoredJobs) {
    const approvalResult = await step.do(
      `approval-gate-${job.id}`,
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const existing = await ctx.env.DB.prepare(
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
          const requestId = await ctx.createApprovalRequest(
            workflow.id,
            job,
            'pending',
            job.matchScore
          );
          await ctx.sendApprovalRequestNotification(workflow.id, requestId, job);
          await step.sleep(`wait-approval-${job.id}`, '24 hours');
          const approvalStatus = await ctx.getApprovalStatus(requestId);
          return { status: approvalStatus, job, requestId };
        }

        await ctx.createApprovalRequest(workflow.id, job, 'rejected', job.matchScore);
        return { status: 'rejected', job, reason: 'Match score below threshold' };
      }
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

  const applicationResults = [];

  if (!dryRun && approvedJobs.length > 0) {
    for (const job of approvedJobs) {
      const result = await step.do(
        `apply-job-${job.id}`,
        {
          retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
          timeout: '5 minutes',
        },
        async () => {
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

  workflow.status =
    workflow.stats.jobsFailed > 0 && workflow.stats.jobsApplied === 0 ? 'failed' : 'completed';
  workflow.completedAt = new Date().toISOString();
  await ctx.saveWorkflowState(workflow);

  await step.do(
    'notify-completion',
    {
      retries: { limit: 2, delay: '10 seconds' },
      timeout: '30 seconds',
    },
    async () => {
      const success = workflow.stats.jobsApplied > 0;
      const icon = success ? '✅' : workflow.stats.jobsFailed > 0 ? '⚠️' : 'ℹ️';
      const status = success ? 'Success' : workflow.stats.jobsFailed > 0 ? 'Partial' : 'No Action';

      await notificationService.sendTelegramNotification({
        text:
          `${icon} <b>Application Workflow Complete</b>\n\n` +
          `<b>Status</b>: ${status}\n` +
          `<b>Trigger</b>: ${triggerType}\n` +
          `<b>Mode</b>: ${dryRun ? 'Dry Run' : 'Live'}\n\n` +
          '<b>Stats</b>:\n' +
          `  Found: ${workflow.stats.jobsFound}\n` +
          `  Approved: ${workflow.stats.jobsApproved}\n` +
          `  Applied: ${workflow.stats.jobsApplied}\n` +
          `  Failed: ${workflow.stats.jobsFailed}\n\n` +
          `<b>Top Jobs</b>:\n${topApprovedJobs(approvedJobs)}`,
      });
    }
  );

  workflow.steps.push({ step: 'notify', status: 'completed' });

  return {
    success: workflow.status === 'completed',
    workflow,
    applications: applicationResults,
    dryRun,
  };
}
