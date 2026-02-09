import { BaseHandler } from './base-handler.js';
import { sendSlackMessage } from '../services/slack.js';
import { normalizeError } from '../lib/errors.js';

/**
 * Handler for profile sync operations.
 * Syncs resume data from SSOT to job platforms.
 */
export class ProfileSyncHandler extends BaseHandler {
  /**
   * Trigger profile sync to job platforms
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerProfileSync(request) {
    const body = await request.json().catch(() => ({}));
    const {
      ssotData, // Resume data from SSOT
      platforms = ['wanted', 'jobkorea', 'saramin'],
      dryRun = true,
      callbackUrl, // n8n or external automation server (legacy, optional)
    } = body;

    const db = this.env?.DB;
    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const now = new Date().toISOString();

      // Validate SSOT data
      if (!ssotData || !ssotData.personal) {
        return this.jsonResponse(
          { success: false, error: 'Invalid SSOT data: missing personal info' },
          400
        );
      }

      // Map SSOT to platform-specific profile data
      const profileData = {
        name: ssotData.personal?.name,
        email: ssotData.personal?.email,
        phone: ssotData.personal?.phone,
        headline:
          `${ssotData.current?.position || 'Engineer'} | ${ssotData.summary?.totalExperience || ''}`.trim(),
        skills: Array.isArray(ssotData.summary?.expertise)
          ? ssotData.summary.expertise.join(',')
          : '',
        summary: ssotData.summary?.tagline || '',
      };

      // Store sync request in D1 for tracking
      const syncId = `sync_${Date.now()}`;
      await db
        .prepare(
          `INSERT INTO profile_syncs (id, platforms, profile_data, status, dry_run, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          syncId,
          JSON.stringify(platforms),
          JSON.stringify(profileData),
          'pending',
          dryRun ? 1 : 0,
          now,
          now
        )
        .run()
        .catch(() => {
          // Table might not exist, continue anyway
        });

      // Results accumulator
      const results = {};

      // ============================================================
      // WANTED: Direct Chaos API Integration (no callback needed)
      // ============================================================
      if (platforms.includes('wanted')) {
        const wantedResult = await this._syncWantedProfile(ssotData, profileData, dryRun);
        results.wanted = wantedResult;
      }

      // ============================================================
      // Other platforms: Legacy callback-based automation
      // ============================================================
      const otherPlatforms = platforms.filter((p) => p !== 'wanted');

      if (otherPlatforms.length > 0 && callbackUrl) {
        const callbackPayload = {
          syncId,
          platforms: otherPlatforms,
          profileData,
          dryRun,
          timestamp: now,
        };

        // Get auth cookies for each platform
        const platformAuth = {};
        for (const platform of otherPlatforms) {
          const cookies = await this.auth.getCookies(platform);
          platformAuth[platform] = { authenticated: !!cookies };
        }
        callbackPayload.platformAuth = platformAuth;

        // Async call to external automation
        const callbackResponse = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackPayload),
          signal: AbortSignal.timeout(30000),
        }).catch((err) => ({ ok: false, error: err.message }));

        if (callbackResponse.ok) {
          const callbackResult = await callbackResponse.json().catch(() => ({}));
          for (const platform of otherPlatforms) {
            results[platform] = {
              method: 'callback',
              dispatched: true,
              automationResult: callbackResult,
            };
          }
        } else {
          for (const platform of otherPlatforms) {
            results[platform] = {
              method: 'callback',
              error: callbackResponse.error || `HTTP ${callbackResponse.status}`,
            };
          }
        }
      } else if (otherPlatforms.length > 0) {
        // No callback URL for other platforms
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

      // Update sync status
      await db
        .prepare('UPDATE profile_syncs SET status = ?, updated_at = ? WHERE id = ?')
        .bind(dryRun ? 'dry_run_complete' : 'synced', now, syncId)
        .run()
        .catch(() => {});

      return this.jsonResponse({
        success: true,
        message: dryRun
          ? 'Dry run complete. See platformResults for details.'
          : 'Profile sync completed. See platformResults for details.',
        syncId,
        dryRun,
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

  /**
   * Sync profile to Wanted using Chaos API directly (no browser automation)
   * @param {Object} ssotData - SSOT resume data
   * @param {Object} profileData - Mapped profile data
   * @param {boolean} dryRun - If true, return diff without applying changes
   * @returns {Promise<Object>} Sync result
   */
  async _syncWantedProfile(ssotData, profileData, dryRun) {
    const { WantedClient } = await import('../services/wanted-client.js');
    const client = new WantedClient();

    // Get session cookies from KV
    const cookies = await this.env?.SESSIONS?.get('wanted:session');
    if (!cookies) {
      return {
        method: 'chaos_api',
        error: 'Not authenticated - no session cookies',
        authenticated: false,
      };
    }
    client.setCookies(cookies);

    try {
      // 1. Get current resume list and select primary resume
      const resumes = await client.getResumeList();
      if (!resumes || resumes.length === 0) {
        return {
          method: 'chaos_api',
          error: 'No resumes found in Wanted account',
          authenticated: true,
        };
      }

      const resumeId = resumes[0]?.id;
      const currentResume = await client.getResumeDetail(resumeId);

      // 2. Build diff/changes
      const changes = {
        profile: { current: null, proposed: profileData.headline },
        careers: [],
        skills: [],
      };

      // Compare careers if present in SSOT
      if (ssotData.careers && Array.isArray(ssotData.careers)) {
        const currentCareers = currentResume?.careers || [];
        changes.careers = this._diffCareers(currentCareers, ssotData.careers);
      }

      if (dryRun) {
        return {
          method: 'chaos_api',
          authenticated: true,
          dryRun: true,
          resumeId,
          currentResume: {
            id: currentResume?.id,
            title: currentResume?.title,
            careersCount: currentResume?.careers?.length || 0,
            skillsCount: currentResume?.skills?.length || 0,
          },
          proposedChanges: changes,
          wouldUpdate: profileData,
        };
      }

      // 3. Apply changes (not dry run)
      const syncResults = { updated: [], failed: [] };

      // Update profile headline
      try {
        await client.updateProfile({ description: profileData.headline });
        syncResults.updated.push('profile_headline');
      } catch (err) {
        const normalized = normalizeError(err, {
          handler: 'ProfileSyncHandler',
          action: 'updateProfile',
        });
        syncResults.failed.push({
          section: 'profile_headline',
          error: normalized.message,
        });
      }

      // Note: Full career/skill sync requires more complex diff logic
      // For now, just regenerate the resume PDF to capture any manual changes
      try {
        await client.saveResume(resumeId);
        syncResults.updated.push('resume_pdf');
      } catch (err) {
        const normalized = normalizeError(err, {
          handler: 'ProfileSyncHandler',
          action: 'saveResume',
          resumeId,
        });
        syncResults.failed.push({ section: 'resume_pdf', error: normalized.message });
      }

      return {
        method: 'chaos_api',
        authenticated: true,
        dryRun: false,
        resumeId,
        syncResults,
        message: `Synced ${syncResults.updated.length} sections, ${syncResults.failed.length} failed`,
      };
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: '_syncWantedProfile',
      });
      return {
        method: 'chaos_api',
        authenticated: true,
        error: normalized.message,
      };
    }
  }

  /**
   * Diff SSOT careers with current Wanted careers
   * @param {Array} currentCareers - Current careers from Wanted
   * @param {Array} ssotCareers - SSOT careers
   * @returns {Array} Diff results
   */
  _diffCareers(currentCareers, ssotCareers) {
    const diffs = [];
    for (const ssotCareer of ssotCareers) {
      const existing = currentCareers.find(
        (c) => c.company_name === ssotCareer.company || c.title === ssotCareer.role
      );
      if (existing) {
        diffs.push({
          action: 'update',
          careerId: existing.id,
          company: ssotCareer.company,
          changes: { role: ssotCareer.role, period: ssotCareer.period },
        });
      } else {
        diffs.push({
          action: 'add',
          company: ssotCareer.company,
          role: ssotCareer.role,
          period: ssotCareer.period,
        });
      }
    }
    return diffs;
  }

  /**
   * Get profile sync status by sync ID
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async getProfileSyncStatus(request) {
    const syncId = request.params?.syncId;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const sync = await db
        .prepare('SELECT * FROM profile_syncs WHERE id = ?')
        .bind(syncId)
        .first();

      if (!sync) {
        return this.jsonResponse({ success: false, error: 'Sync not found' }, 404);
      }

      return this.jsonResponse({
        success: true,
        sync: {
          id: sync.id,
          platforms: JSON.parse(sync.platforms || '[]'),
          status: sync.status,
          dryRun: !!sync.dry_run,
          result: sync.result ? JSON.parse(sync.result) : null,
          createdAt: sync.created_at,
          updatedAt: sync.updated_at,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'getProfileSyncStatus',
        syncId,
      });
      console.error('Get profile sync status failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  /**
   * Update profile sync status (callback from external automation)
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async updateProfileSyncStatus(request) {
    const body = await request.json().catch(() => ({}));
    const { syncId, status, result } = body;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const now = new Date().toISOString();
      await db
        .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
        .bind(status, JSON.stringify(result || {}), now, syncId)
        .run();

      // Notify via Slack
      if (status === 'completed') {
        const platforms = result?.platforms || [];
        const successCount = platforms.filter((p) => p.success).length;

        await sendSlackMessage(this.env, {
          text: `\u2705 Profile Sync Complete: ${successCount}/${platforms.length} platforms updated`,
        });
      }

      return this.jsonResponse({
        success: true,
        message: 'Sync status updated',
        syncId,
        status,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'updateProfileSyncStatus',
        syncId,
      });
      console.error('Update profile sync status failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}
