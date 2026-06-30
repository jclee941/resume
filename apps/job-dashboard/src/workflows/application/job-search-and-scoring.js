import { calculateMatchScore } from '../../handlers/auto-apply/match-scoring.js';
import { isAtsDryRunPlatform } from './platforms.js';
import { averageScore } from './workflow-records.js';

export async function initializeWorkflow(ctx, step, workflow, triggerType, platforms) {
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
}

export async function checkDailyLimits(ctx, step, workflow, maxDailyApplications) {
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

  return dailyCheck;
}

export async function searchWorkflowJobs(ctx, step, workflow, platforms, searchCriteria) {
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

  return jobsFound;
}

export async function scoreWorkflowJobs(ctx, step, workflow, jobsFound, minMatchScore, dailyCheck) {
  const scoredJobs = await step.do(
    'score-jobs',
    {
      retries: { limit: 2, delay: '5 seconds' },
      timeout: '2 minutes',
    },
    async () => {
      const config = await ctx.getMatchingConfig();

      return jobsFound
        .map((job) => scoreJob(job, config))
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

  return scoredJobs;
}

function scoreJob(job, config) {
  const explicitScore = Number(job?.matchScore);
  const matchScore = Number.isFinite(explicitScore)
    ? explicitScore
    : hasDeterministicAtsDryRunScore(job)
      ? job.matchScore
      : calculateMatchScore(job, config);
  const scoredJob = { ...job, matchScore };

  if (!isAtsDryRunJob(scoredJob)) return scoredJob;

  return {
    ...scoredJob,
    dryRun: true,
    status: 'dry-run',
    action: 'would_apply',
  };
}

function hasDeterministicAtsDryRunScore(job) {
  return isAtsDryRunJob(job) && Number.isFinite(job.matchScore);
}

function isAtsDryRunJob(job) {
  return job?.atsStub === true && isAtsDryRunPlatform(job.source);
}
