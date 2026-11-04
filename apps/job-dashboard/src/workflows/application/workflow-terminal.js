import { notifyFailure, notifyNoJobs } from './workflow-notifications.js';

/**
 * @param {import('../application.js').ApplicationWorkflow} ctx
 * @param {import('cloudflare:workers').WorkflowStep} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {import('../../services/notifications.js').NotificationService} notificationService
 * @param {string} triggerType
 * @param {string[]} platforms
 * @returns {Promise<Record<string, unknown>>}
 */
export async function completeWithoutJobs(
  ctx,
  step,
  workflow,
  notificationService,
  triggerType,
  platforms
) {
  const failed = workflow.searchFailed === true;
  const message = failed ? 'Job search failed on all platforms' : 'No jobs found';
  workflow.status = failed ? 'failed' : 'completed';
  workflow.completedAt = new Date().toISOString();
  workflow.steps.push({ step: 'complete', status: failed ? 'failed' : 'no-jobs-found', message });
  await step.do(
    failed ? 'notify-search-failure' : 'notify-no-jobs',
    { retries: { limit: 2, delay: '10 seconds' }, timeout: '30 seconds' },
    async () => {
      if (failed) await notifyFailure(notificationService, triggerType, platforms, message);
      else await notifyNoJobs(notificationService, triggerType, platforms);
      return { notified: true };
    }
  );
  await step.do(
    'persist-search-outcome',
    { retries: { limit: 3, delay: '5 seconds' }, timeout: '30 seconds' },
    async () => {
      await ctx.saveWorkflowState(workflow);
      return { saved: true };
    }
  );
  return { success: !failed, workflow, message };
}

/**
 * @param {import('../application.js').ApplicationWorkflow} ctx
 * @param {import('cloudflare:workers').WorkflowStep} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @returns {Promise<Record<string, unknown>>}
 */
export async function completeAtDailyLimit(ctx, step, workflow) {
  const message = 'Daily limit reached';
  workflow.status = 'completed';
  workflow.completedAt = new Date().toISOString();
  workflow.steps.push({ step: 'daily-limit-reached', status: 'completed', message });
  await step.do(
    'persist-daily-limit',
    { retries: { limit: 3, delay: '5 seconds' }, timeout: '30 seconds' },
    async () => {
      await ctx.saveWorkflowState(workflow);
      return { saved: true };
    }
  );
  return { success: true, workflow, message };
}

/**
 * @param {import('../application.js').ApplicationWorkflow} ctx
 * @param {import('cloudflare:workers').WorkflowStep} step
 * @param {import('./workflow-records.js').WorkflowRecord} workflow
 * @param {unknown} error
 * @returns {Promise<void>}
 */
export async function persistFailedWorkflow(ctx, step, workflow, error) {
  const message = error instanceof Error ? error.message : String(error);
  workflow.status = 'failed';
  workflow.completedAt = new Date().toISOString();
  workflow.steps.push({ step: 'run', status: 'failed' });
  workflow.errors.push({ step: 'run', error: message });
  try {
    // Cache only the same failure snapshot; later failures must persist their own diagnostics.
    // Exclude timestamps and hash the context so step names contain no error text or personal data.
    const context = JSON.stringify([workflow.steps, workflow.stats, workflow.errors]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(context));
    const identity = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    await step.do(
      `persist-failed-workflow-${identity}`,
      { retries: { limit: 3, delay: '5 seconds' }, timeout: '30 seconds' },
      async () => {
        await ctx.saveWorkflowState(workflow);
        return { saved: true };
      }
    );
  } catch (persistenceError) {
    const detail =
      persistenceError instanceof Error ? persistenceError.message : String(persistenceError);
    workflow.errors.push({ step: 'persist-failed-workflow', error: detail });
    console.error('Failed to persist terminal workflow state', {
      workflowId: workflow.id,
      error: detail,
      originalError: message,
    });
  }
}
