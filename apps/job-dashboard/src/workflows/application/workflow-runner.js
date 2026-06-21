import { processApprovalGates } from './approval-gates.js';
import { submitApprovedApplications } from './application-submissions.js';
import { normalizeApplicationPlatforms } from './platforms.js';
import {
  checkDailyLimits,
  initializeWorkflow,
  scoreWorkflowJobs,
  searchWorkflowJobs,
} from './job-search-and-scoring.js';
import { createWorkflowRecord, completeWorkflow } from './workflow-records.js';
import {
  createNotificationService,
  notifyCompletion,
  notifyNoJobs,
} from './workflow-notifications.js';

export async function runApplicationWorkflow(ctx, event, step) {
  const {
    triggerType = 'manual',
    platforms: requestedPlatforms = ['wanted'],
    searchCriteria = {},
    resumeId = 'default',
    autoApprove = false,
    autoApproveThreshold = 75,
    minMatchScore = 60,
    maxDailyApplications = 10,
    dryRun = true,
    atsStub = false,
    explicitSubmit = false,
    submitOptIn = false,
    _eventData = {},
  } = event.payload;
  const platforms = normalizeApplicationPlatforms(requestedPlatforms, { atsStub, dryRun });
  const criteria = atsStub ? { ...searchCriteria, atsStub } : searchCriteria;

  const workflow = createWorkflowRecord(event, triggerType);
  const notificationService = createNotificationService(ctx);

  await initializeWorkflow(ctx, step, workflow, triggerType, platforms);
  const dailyCheck = await checkDailyLimits(ctx, step, workflow, maxDailyApplications);
  const jobsFound = await searchWorkflowJobs(ctx, step, workflow, platforms, criteria);

  if (jobsFound.length === 0) {
    return completeWithoutJobs(ctx, step, workflow, notificationService, triggerType, platforms);
  }

  const scoredJobs = await scoreWorkflowJobs(
    ctx,
    step,
    workflow,
    jobsFound,
    minMatchScore,
    dailyCheck
  );
  const { approvedJobs } = await processApprovalGates(
    ctx,
    step,
    workflow,
    scoredJobs,
    autoApprove,
    autoApproveThreshold
  );
  const applicationResults = await submitApprovedApplications(
    ctx,
    step,
    workflow,
    approvedJobs,
    resumeId,
    dryRun,
    { explicitSubmit, submitOptIn }
  );

  completeWorkflow(workflow);
  await ctx.saveWorkflowState(workflow);

  await step.do(
    'notify-completion',
    {
      retries: { limit: 2, delay: '10 seconds' },
      timeout: '30 seconds',
    },
    async () => {
      await notifyCompletion(notificationService, workflow, triggerType, dryRun, approvedJobs);
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

async function completeWithoutJobs(
  ctx,
  step,
  workflow,
  notificationService,
  triggerType,
  platforms
) {
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
