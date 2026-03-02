import { BaseHandler } from './base-handler.js';
import { sendSlackMessage } from '../services/slack.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

/**
 * Handler for auto-apply operations.
 * Automatically applies to jobs matching criteria.
 */
export class AutoApplyWebhookHandler extends BaseHandler {
  /**
   * Trigger auto-apply for matching jobs
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerAutoApply(request) {
    const body = await request.json().catch(() => ({}));
    const { minMatchScore = 70, maxApplications = 5, dryRun = true } = body;

    const db = this.env?.DB;
    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      // 1. Get Wanted auth cookies
      const cookies = await this.auth.getCookies('wanted');
      if (!cookies) {
        return this.jsonResponse(
          {
            success: false,
            error: 'Wanted authentication required. Please login first.',
          },
          401
        );
      }

      // 2. Get default resume ID
      const listResponse = await fetch('https://www.wanted.co.kr/api/chaos/resumes/v1/list', {
        headers: { Cookie: cookies },
        signal: AbortSignal.timeout(10000),
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to list resumes: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const resumes = listData.data || [];
      const mainResume = resumes.find((r) => r.is_default) || resumes[0];

      if (!mainResume) {
        return this.jsonResponse(
          {
            success: false,
            error: 'No resume found. Please create a resume on Wanted first.',
          },
          404
        );
      }

      // 3. Get high-match jobs from D1 that haven't been applied yet
      const jobs = await db
        .prepare(
          `SELECT id, job_id, position, company, match_score, source_url 
           FROM applications 
           WHERE source = 'wanted' 
             AND status = 'saved' 
             AND match_score >= ? 
           ORDER BY match_score DESC, created_at ASC 
           LIMIT ?`
        )
        .bind(minMatchScore, maxApplications)
        .all();

      const candidates = jobs.results || [];

      if (candidates.length === 0) {
        return this.jsonResponse({
          success: true,
          message: 'No matching jobs found for auto-apply',
          applied: 0,
          failed: 0,
          skipped: 0,
          dryRun,
        });
      }

      const results = { applied: [], failed: [], skipped: [] };
      const now = new Date().toISOString();

      // 4. Apply to each job
      for (const job of candidates) {
        if (dryRun) {
          results.skipped.push({
            id: job.id,
            company: job.company,
            position: job.position,
            matchScore: job.match_score,
            reason: 'dry_run',
          });
          continue;
        }

        try {
          // Call Wanted Apply API
          const applyResponse = await fetch('https://www.wanted.co.kr/api/chaos/applications/v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookies,
            },
            body: JSON.stringify({
              job_id: parseInt(job.job_id),
              resume_id: mainResume.id,
              cover_letter: '',
            }),
            signal: AbortSignal.timeout(15000),
          });

          if (applyResponse.ok) {
            // Update status in D1
            await db
              .prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?')
              .bind('applied', now, job.id)
              .run();

            // Add timeline entry
            await db
              .prepare(
                'INSERT INTO application_timeline (application_id, status, note, timestamp) VALUES (?, ?, ?, ?)'
              )
              .bind(job.id, 'applied', 'Auto-applied via Worker automation', now)
              .run();

            results.applied.push({
              id: job.id,
              company: job.company,
              position: job.position,
              matchScore: job.match_score,
            });
          } else {
            const errorText = await applyResponse.text().catch(() => 'Unknown error');
            results.failed.push({
              id: job.id,
              company: job.company,
              position: job.position,
              error: `HTTP ${applyResponse.status}: ${errorText.slice(0, 100)}`,
            });
          }
        } catch (applyError) {
          const normalized = normalizeError(applyError, {
            handler: 'AutoApplyWebhookHandler',
            action: 'applyToJob',
            jobId: job.id,
            company: job.company,
          });
          results.failed.push({
            id: job.id,
            company: job.company,
            position: job.position,
            error: normalized.message,
          });
        }

        // Rate limit: wait 2s between applications
        if (!dryRun && candidates.indexOf(job) < candidates.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // 5. Notify via Slack
      if (!dryRun && results.applied.length > 0) {
        const appliedList = results.applied
          .map((j) => `\u2022 ${j.company} - ${j.position} (${j.matchScore}%)`)
          .join('\n');

        await sendSlackMessage(this.env, {
          text: `\u2705 Auto-Apply Complete: ${results.applied.length} applications submitted`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Auto-Apply Results*\n${appliedList}`,
              },
            },
          ],
        });
      }

      return this.jsonResponse({
        success: true,
        message: dryRun
          ? `Dry run complete. ${candidates.length} jobs would be applied to.`
          : `Auto-apply complete. Applied: ${results.applied.length}, Failed: ${results.failed.length}`,
        applied: results.applied.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        dryRun,
        resumeId: mainResume.id,
        details: results,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'AutoApplyWebhookHandler',
        action: 'triggerAutoApply',
      });
      console.error('Auto-apply webhook failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}
