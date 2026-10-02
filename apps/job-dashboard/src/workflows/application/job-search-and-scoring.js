import { calculateMatchScore } from '../../handlers/auto-apply/match-scoring.js';
import { isAtsDryRunPlatform } from './platforms.js';
import { averageScore } from './workflow-records.js';

/**
 * @typedef {{
 *   saveWorkflowState(workflow: import('./workflow-records.js').WorkflowRecord): Promise<unknown>;
 *   logWorkflowStep(workflowId: string, stepName: string, status: string, data?: Record<string, unknown>): Promise<unknown>;
 *   getDailyApplicationCount(date: string): Promise<number>;
 *   searchJobs(platform: string, searchCriteria?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
 *   getMatchingConfig(): Promise<import('../../handlers/auto-apply/match-scoring.js').MatchScoringConfig>;
 * }} ApplicationWorkflowContext
 */

/**
 * @typedef {import('cloudflare:workers').WorkflowStep} WorkflowStepContext
 */

/**
 * @typedef {{
 *   remaining: number;
 *   alreadyApplied: number;
 * }} DailyLimitCheckResult
 */

/**
 * @typedef {import('../../handlers/auto-apply/match-scoring.js').ScorableJob & Record<string, unknown> & {
 *   source?: string;
 *   matchScore?: number;
 *   matchPercentage?: number | string;
 *   atsStub?: boolean;
 * }} JobSearchRecord
 */

/**
 * @typedef {JobSearchRecord & {
 *   matchScore: number;
 * }} ScoredWorkflowJob
 */

/**
 * @param {ApplicationWorkflowContext} ctx
 * @param {WorkflowStepContext} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {string} triggerType
 * @param {string[]} platforms
 * @returns {Promise<void>}
 */
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

/**
 * @param {ApplicationWorkflowContext} ctx
 * @param {WorkflowStepContext} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {number} maxDailyApplications
 * @returns {Promise<DailyLimitCheckResult>}
 */
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

/**
 * @param {ApplicationWorkflowContext} ctx
 * @param {WorkflowStepContext} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {string[]} platforms
 * @param {Record<string, unknown>} [searchCriteria]
 * @returns {Promise<JobSearchRecord[]>}
 */
export async function searchWorkflowJobs(ctx, step, workflow, platforms, searchCriteria) {
  /** @type {JobSearchRecord[]} */
  const jobsFound = [];

  for (const platform of platforms) {
    const outcome = await step.do(
      `search-jobs-${platform}`,
      {
        retries: { limit: 2, delay: '10 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      },
      async () => {
        try {
          const platformJobs = await ctx.searchJobs(platform, searchCriteria);
          return {
            jobs: platformJobs.map((job) => ({ ...job, source: platform })),
            error: null,
          };
        } catch (error) {
          return { jobs: [], error: error instanceof Error ? error.message : String(error) };
        }
      }
    );

    if (outcome.error !== null) {
      workflow.errors.push({ platform, error: outcome.error });
      console.error(`Failed to search ${platform}:`, outcome.error);
    }
    jobsFound.push(...outcome.jobs);

    if (platforms.indexOf(platform) < platforms.length - 1) {
      await step.sleep(`pause-after-${platform}`, '10 seconds');
    }
  }

  workflow.stats.jobsFound = jobsFound.length;
  workflow.steps.push({ step: 'search-jobs', status: 'completed', count: jobsFound.length });
  await ctx.logWorkflowStep(workflow.id, 'search-jobs', 'completed', { count: jobsFound.length });

  return jobsFound;
}

/**
 * Scores every found job and keeps those at or above the threshold, best first. The daily cap is
 * applied by the approval gate, so jobs already applied to do not use it up.
 * @param {ApplicationWorkflowContext} ctx
 * @param {WorkflowStepContext} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {JobSearchRecord[]} jobsFound
 * @param {number} minMatchScore
 * @returns {Promise<ScoredWorkflowJob[]>}
 */
export async function scoreWorkflowJobs(ctx, step, workflow, jobsFound, minMatchScore) {
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
        .sort((a, b) => b.matchScore - a.matchScore);
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

/**
 * @param {JobSearchRecord} job
 * @param {import('../../handlers/auto-apply/match-scoring.js').MatchScoringConfig} config
 * @returns {ScoredWorkflowJob}
 */
function scoreJob(job, config) {
  const explicitScore = normalizedExplicitScore(job);
  const matchScore =
    explicitScore !== null
      ? explicitScore
      : hasDeterministicAtsDryRunScore(job)
        ? /** @type {number} */ (job.matchScore)
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

/**
 * @param {JobSearchRecord} [job]
 * @returns {number | null}
 */
function normalizedExplicitScore(job) {
  return normalizeScore(job?.matchPercentage) ?? normalizeScore(job?.matchScore);
}

/**
 * @param {unknown} [value]
 * @returns {number | null}
 */
function normalizeScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

/**
 * @param {JobSearchRecord} job
 * @returns {boolean}
 */
function hasDeterministicAtsDryRunScore(job) {
  return isAtsDryRunJob(job) && Number.isFinite(job.matchScore);
}

/**
 * @param {JobSearchRecord} [job]
 * @returns {boolean}
 */
function isAtsDryRunJob(job) {
  return job?.atsStub === true && isAtsDryRunPlatform(job.source);
}
