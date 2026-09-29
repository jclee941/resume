import { BaseHandler } from './base-handler.js';
import { normalizeError } from '@resume/shared/errors';
import {
  JOBKOREA_SESSION_EXPIRED,
  RESUME_SYNC_PLATFORMS,
  syncResumePlatform,
} from '../services/resume-platform-sync/index.js';
import { refreshJobKoreaSession } from './jobkorea/mint-session.js';
import {
  getProfileSyncStatusResponse,
  updateProfileSyncStatusResponse,
} from './sync/profile-sync-status.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<{ data?: string; target_resume_id?: string | null; id?: string; platforms?: string; status?: string; dry_run?: number; result?: string; created_at?: string; updated_at?: string } | null>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} ProfileSyncDb
 */

/**
 * @typedef {{
 *   JOB_DB?: ProfileSyncDb;
 * } & import('../services/resume-platform-sync/index.js').ResumePlatformSyncEnv &
 *   Parameters<typeof refreshJobKoreaSession>[0] &
 *   import('../services/notifications.js').NotificationEnv} ProfileSyncEnv
 */

/**
 * @typedef {{
 *   resumeId?: string;
 *   targetResumeId?: string | null;
 *   ssotData?: import('../services/resume-platform-sync/index.js').ResumePlatformSsot | null;
 *   platforms?: string[];
 *   dryRun?: boolean;
 * }} ProfileSyncRequestBody
 */

/**
 * @extends {BaseHandler<ProfileSyncEnv>}
 */
export class ProfileSyncHandler extends BaseHandler {
  /** Platform sync entry point; tests replace it to avoid live platform calls. */
  syncPlatform = syncResumePlatform;

  /** JobKorea session mint (Browser Rendering login); tests replace it. */
  refreshJobKoreaSession = refreshJobKoreaSession;

  /**
   * Sync the master resume (JOB_DB `resumes`) to job platforms inside the Worker,
   * reading platform sessions from KV. Defaults to a dry run.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerProfileSync(request) {
    /** @type {ProfileSyncRequestBody} */
    const body = await request.json().catch(() => ({}));
    const logicalResumeId = body.resumeId || 'master';
    const platforms =
      Array.isArray(body.platforms) && body.platforms.length > 0
        ? body.platforms
        : [...RESUME_SYNC_PLATFORMS];
    const dryRun = body.dryRun !== false;
    const db = this.env?.JOB_DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      let ssotData = body.ssotData || null;
      let targetResumeId = body.targetResumeId || null;
      if (!ssotData || !targetResumeId) {
        const stored = await db
          .prepare('SELECT data, target_resume_id FROM resumes WHERE id = ?')
          .bind(logicalResumeId)
          .first();
        if (!ssotData) {
          if (!stored?.data) {
            return this.jsonResponse(
              { success: false, error: 'No stored master resume found. Upload resume JSON first.' },
              404
            );
          }
          ssotData = JSON.parse(stored.data);
        }
        targetResumeId = targetResumeId || stored?.target_resume_id || null;
      }

      if (!ssotData?.personal) {
        return this.jsonResponse(
          { success: false, error: 'Invalid SSOT data: missing personal info' },
          400
        );
      }

      const now = new Date().toISOString();
      const syncId = `sync_${Date.now()}`;
      await db
        .prepare(
          `INSERT INTO profile_syncs (id, platforms, profile_data, status, dry_run, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          syncId,
          JSON.stringify(platforms),
          JSON.stringify({ logicalResumeId, targetResumeId }),
          'running',
          dryRun ? 1 : 0,
          now,
          now
        )
        .run();

      /** @type {Record<string, import('../services/resume-platform-sync/index.js').PlatformSyncOutcome>} */
      const results = {};
      for (const platform of platforms) {
        const options = { dryRun, targetResumeId };
        let result = await this.syncPlatform(this.env, platform, ssotData, options);
        if (result.code === JOBKOREA_SESSION_EXPIRED) {
          const refreshed = await this.refreshJobKoreaSession(this.env);
          result = refreshed.ok
            ? await this.syncPlatform(this.env, platform, ssotData, options)
            : {
                ...result,
                error: `${result.error}; JobKorea session refresh failed: ${refreshed.error}`,
              };
        }
        results[platform] = result;
      }

      const success = Object.values(results).every((result) => result.success);
      const status = dryRun
        ? success
          ? 'dry_run_complete'
          : 'dry_run_failed'
        : success
          ? 'completed'
          : 'partial_failed';
      await db
        .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
        .bind(status, JSON.stringify(results), new Date().toISOString(), syncId)
        .run();

      return this.jsonResponse({
        success,
        message: dryRun
          ? success
            ? 'Dry run complete.'
            : 'Dry run completed with issues.'
          : success
            ? 'Profile sync completed.'
            : 'Profile sync completed with issues.',
        syncId,
        dryRun,
        resumeId: logicalResumeId,
        targetResumeId,
        platforms,
        platformResults: results,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'triggerProfileSync',
      });
      console.error('Profile sync failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async getProfileSyncStatus(request) {
    return getProfileSyncStatusResponse(this, request);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async updateProfileSyncStatus(request) {
    return updateProfileSyncStatusResponse(this, request);
  }
}
