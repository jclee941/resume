import { BaseHandler } from './base-handler.js';
import { normalizeError } from '@resume/shared/errors';
import { buildProfileData } from './mappers/index.js';
import { syncWantedProfile } from './sync/wanted-profile-sync.js';
import {
  getProfileSyncStatusResponse,
  updateProfileSyncStatusResponse,
} from './sync/profile-sync-status.js';

export class ProfileSyncHandler extends BaseHandler {
  async triggerProfileSync(request) {
    const body = await request.json().catch(() => ({}));
    const logicalResumeId = body.resumeId || 'master';
    let targetResumeId = body.targetResumeId || null;
    let ssotData = body.ssotData || null;
    const platforms =
      Array.isArray(body.platforms) && body.platforms.length > 0 ? body.platforms : ['wanted'];
    const dryRun = body.dryRun !== false;
    const callbackUrl = body.callbackUrl;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      if (!ssotData) {
        const stored = await db
          .prepare('SELECT data, target_resume_id FROM resumes WHERE id = ?')
          .bind(logicalResumeId)
          .first();

        if (!stored?.data) {
          return this.jsonResponse(
            { success: false, error: 'No stored master resume found. Upload resume JSON first.' },
            404
          );
        }

        ssotData = JSON.parse(stored.data);
        targetResumeId = targetResumeId || stored.target_resume_id || null;
      }

      if (!ssotData?.personal) {
        return this.jsonResponse(
          { success: false, error: 'Invalid SSOT data: missing personal info' },
          400
        );
      }

      const now = new Date().toISOString();
      const syncId = `sync_${Date.now()}`;
      const profileData = buildProfileData(ssotData);

      await db
        .prepare(
          `INSERT INTO profile_syncs (id, platforms, profile_data, status, dry_run, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          syncId,
          JSON.stringify(platforms),
          JSON.stringify({ logicalResumeId, targetResumeId, profileData }),
          'running',
          dryRun ? 1 : 0,
          now,
          now
        )
        .run()
        .catch((e) => {
          console.error('[ProfileSync] Failed to create sync record:', normalizeError(e).message);
        });

      const results = {};

      if (platforms.includes('wanted')) {
        results.wanted = await syncWantedProfile(
          {
            auth: this.auth,
          },
          ssotData,
          profileData,
          dryRun,
          targetResumeId
        );
      }

      const otherPlatforms = platforms.filter((platform) => platform !== 'wanted');
      if (otherPlatforms.length > 0 && callbackUrl) {
        const callbackPayload = {
          syncId,
          platforms: otherPlatforms,
          profileData,
          dryRun,
          timestamp: now,
        };

        const platformAuth = {};
        for (const platform of otherPlatforms) {
          const cookies = await this.auth.getCookies(platform);
          platformAuth[platform] = { authenticated: !!cookies };
        }
        callbackPayload.platformAuth = platformAuth;

        const callbackResponse = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackPayload),
          signal: AbortSignal.timeout(30000),
        }).catch((err) => ({ ok: false, error: err.message }));

        const callbackResult = callbackResponse.ok
          ? await callbackResponse.json().catch(() => ({}))
          : null;

        for (const platform of otherPlatforms) {
          results[platform] = callbackResponse.ok
            ? {
                method: 'callback',
                dispatched: true,
                automationResult: callbackResult,
              }
            : {
                method: 'callback',
                error: callbackResponse.error || `HTTP ${callbackResponse.status}`,
              };
        }
      } else {
        for (const platform of otherPlatforms) {
          const cookies = await this.auth.getCookies(platform);
          results[platform] = {
            method: 'callback_required',
            authenticated: !!cookies,
            wouldUpdate: profileData,
            message: 'Browser automation required (provide callbackUrl)',
          };
        }
      }

      const hasFailures = Object.values(results).some((result) => {
        if (!result) return false;
        if (result.error) return true;
        if (result.authenticated === false) return true;
        if (result.method === 'callback' && result.dispatched === false) return true;
        return Array.isArray(result?.syncResults?.failed) && result.syncResults.failed.length > 0;
      });
      const status = dryRun
        ? hasFailures
          ? 'dry_run_failed'
          : 'dry_run_complete'
        : hasFailures
          ? 'partial_failed'
          : 'completed';
      const success = !hasFailures;

      await db
        .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
        .bind(status, JSON.stringify(results), now, syncId)
        .run()
        .catch((e) => {
          console.error('[ProfileSync] Failed to update sync status:', normalizeError(e).message);
        });

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
        profileData,
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

  async getProfileSyncStatus(request) {
    return getProfileSyncStatusResponse(this, request);
  }

  async updateProfileSyncStatus(request) {
    return updateProfileSyncStatusResponse(this, request);
  }
}
