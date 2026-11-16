import { SUBMIT_PREVIEW_PLATFORMS } from './application-platform-catalog.js';
import { safePreviewText } from './application-submission-gates.js';

/** Each preview borrows a browser and logs in, so a dry run previews only the best few jobs. */
export const MAX_SUBMIT_PREVIEWS = 3;

/**
 * @typedef {{
 *   submitApplication(params: Record<string, unknown>): Promise<Record<string, unknown>>;
 * }} PreviewContext
 */

/**
 * Dry-run previews for platforms whose submitter can open the application form without sending
 * it: the best MAX_SUBMIT_PREVIEWS approved jobs of those platforms are opened up to the final
 * submit control and reported, and nothing is submitted or recorded. A failed preview is reported
 * as such and never fails the run.
 * @param {PreviewContext} ctx
 * @param {import('cloudflare:workers').WorkflowStep} step
 * @param {import('./application-submission-gates.js').GateJob[]} jobs
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function previewSubmissions(ctx, step, jobs) {
  const previewable = jobs
    .filter((job) => SUBMIT_PREVIEW_PLATFORMS.includes(String(job?.source)))
    .slice(0, MAX_SUBMIT_PREVIEWS);
  const results = [];
  for (const job of previewable) {
    const preview = await step.do(
      `preview-job-${job.id}`,
      { retries: { limit: 1, delay: '10 seconds' }, timeout: '5 minutes' },
      async () =>
        ctx.submitApplication({
          platform: job.source,
          jobId: job.id,
          sourceUrl: job.sourceUrl || job.url,
          job,
          preview: true,
        })
    );
    results.push({
      ...preview,
      success: preview.preview === true,
      dryRun: true,
      networkWrite: false,
      action: 'previewed_submit',
      platform: safePreviewText(job.source),
      jobId: safePreviewText(job.id),
      company: safePreviewText(job.company),
      position: safePreviewText(job.position || job.title),
    });
  }
  return results;
}
