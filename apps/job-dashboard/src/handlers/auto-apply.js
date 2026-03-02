import { WantedClient } from '../services/wanted-client.js';
import { LinkedInClient } from '../services/linkedin-client.js';
import { RememberClient } from '../services/remember-client.js';
import { normalizeError } from '../../../job-server/src/shared/errors/index.js';
import { calculateMatchScore } from './auto-apply/match-scoring.js';
import { getWantedSession } from './auto-apply/session-helpers.js';
import {
  getConfig,
  getTodayApplicationCount,
  isAlreadyApplied,
  recordApplication,
} from './auto-apply/db-helpers.js';

const SUPPORTED_PLATFORMS = ['wanted', 'linkedin', 'remember'];

export class AutoApplyHandler {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
    this.sessions = env.SESSIONS;
    this.clients = {
      wanted: new WantedClient(),
      linkedin: new LinkedInClient(env),
      remember: new RememberClient(env),
    };
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async run(request) {
    const body = await request.json().catch(() => ({}));
    const {
      dryRun = true,
      maxApplications = null,
      keywords = null,
      platforms = ['wanted', 'linkedin', 'remember'],
    } = body;

    const config = await getConfig(this.env);

    if (!config.autoApplyEnabled && !dryRun) {
      return this.jsonResponse(
        {
          success: false,
          error: 'Auto-apply is disabled',
          hint: 'Enable via PUT /api/config with auto_apply_enabled=true',
        },
        400
      );
    }

    const activePlatforms = platforms.filter((p) => SUPPORTED_PLATFORMS.includes(p));
    if (activePlatforms.length === 0) {
      return this.jsonResponse(
        {
          success: false,
          error: `No valid platforms. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
        400
      );
    }

    const searchKeywords = keywords || config.keywords;
    const maxApps = maxApplications || config.maxDailyApplications;
    const minScore = config.minMatchScore;

    const todayCount = await getTodayApplicationCount(this.env);
    const remaining = Math.max(0, maxApps - todayCount);

    if (remaining === 0 && !dryRun) {
      return this.jsonResponse({
        success: true,
        message: 'Daily limit reached',
        todayApplications: todayCount,
        maxDaily: maxApps,
      });
    }

    const searchResults = {
      searched: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      errors: 0,
      jobs: [],
      byPlatform: {},
    };

    try {
      const allJobs = [];
      const seen = new Set();

      if (activePlatforms.includes('wanted')) {
        const wantedCookies = await getWantedSession(this.env);
        if (wantedCookies) {
          this.clients.wanted.setCookies(wantedCookies);
        }
      }

      for (const platform of activePlatforms) {
        const client = this.clients[platform];
        searchResults.byPlatform[platform] = {
          searched: 0,
          matched: 0,
          applied: 0,
        };

        for (const keyword of searchKeywords.slice(0, 5)) {
          try {
            const result = await client.searchJobs(keyword, { limit: 20 });
            const jobs = result.jobs || result || [];

            for (const job of jobs) {
              const uniqueId = `${job.source || platform}_${job.sourceId || job.id}`;
              if (!seen.has(uniqueId)) {
                seen.add(uniqueId);
                allJobs.push({
                  ...job,
                  source: platform,
                  keyword,
                });
                searchResults.byPlatform[platform].searched++;
              }
            }
          } catch (err) {
            const normalized = normalizeError(err, {
              handler: 'AutoApply',
              action: 'search',
              platform,
              keyword,
            });
            console.error(
              `[AutoApply] ${platform} search failed for "${keyword}":`,
              normalized.message
            );
          }
        }
      }

      searchResults.searched = allJobs.length;

      const scoredJobs = allJobs.map((job) => ({
        ...job,
        matchScore: calculateMatchScore(job, { keywords: searchKeywords }),
      }));

      const matchedJobs = scoredJobs
        .filter((job) => job.matchScore >= minScore)
        .sort((a, b) => b.matchScore - a.matchScore);

      searchResults.matched = matchedJobs.length;

      for (const job of matchedJobs) {
        if (job.source && searchResults.byPlatform[job.source]) {
          searchResults.byPlatform[job.source].matched++;
        }
      }

      let appliedCount = 0;
      for (const job of matchedJobs) {
        if (appliedCount >= remaining) break;

        const alreadyApplied = await isAlreadyApplied(this.env, job.sourceId || job.id, job.source);
        if (alreadyApplied) {
          searchResults.skipped++;
          continue;
        }

        if (dryRun) {
          searchResults.jobs.push({
            id: job.sourceId || job.id,
            source: job.source,
            position: job.position || job.title,
            company: job.company,
            matchScore: job.matchScore,
            url: job.sourceUrl || job.url,
            action: 'would_apply',
          });
          await recordApplication(this.env, { job, source: job.source, status: 'pending' });
          appliedCount++;
          if (searchResults.byPlatform[job.source]) {
            searchResults.byPlatform[job.source].applied++;
          }
        } else {
          if (job.source === 'wanted') {
            try {
              const cookies = await getWantedSession(this.env);
              if (!cookies) {
                searchResults.skipped++;
                continue;
              }
              this.clients.wanted.setCookies(cookies);
              const result = await this.clients.wanted.apply(job.sourceId || job.id);
              await recordApplication(this.env, {
                job,
                source: job.source,
                status: 'applied',
                result,
              });
              searchResults.jobs.push({
                id: job.sourceId || job.id,
                source: job.source,
                position: job.position || job.title,
                company: job.company,
                matchScore: job.matchScore,
                url: job.sourceUrl || job.url,
                action: 'applied',
              });
              appliedCount++;
              if (searchResults.byPlatform[job.source]) {
                searchResults.byPlatform[job.source].applied++;
              }
            } catch (err) {
              const normalized = normalizeError(err, {
                handler: 'AutoApply',
                action: 'apply',
                platform: job.source,
                jobId: job.sourceId,
              });
              console.error(
                `[AutoApply] Apply failed for ${job.source}/${job.sourceId}:`,
                normalized.message
              );
              searchResults.errors++;
              await recordApplication(this.env, {
                job,
                source: job.source,
                status: 'error',
                result: { error: normalized.message },
              });
            }
          } else {
            await recordApplication(this.env, { job, source: job.source, status: 'pending' });
            searchResults.jobs.push({
              id: job.sourceId || job.id,
              source: job.source,
              position: job.position || job.title,
              company: job.company,
              matchScore: job.matchScore,
              url: job.sourceUrl || job.url,
              action: 'saved_for_manual_apply',
            });
            appliedCount++;
            if (searchResults.byPlatform[job.source]) {
              searchResults.byPlatform[job.source].applied++;
            }
          }
        }
      }

      searchResults.applied = appliedCount;

      return this.jsonResponse({
        success: true,
        dryRun,
        platforms: activePlatforms,
        config: {
          keywords: searchKeywords,
          minMatchScore: minScore,
          maxDailyApplications: maxApps,
        },
        todayApplications: todayCount,
        remaining,
        results: searchResults,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'AutoApply',
        action: 'executeAutoApply',
      });
      console.error('[AutoApply] Auto-apply error:', normalized.message, normalized.context);
      return this.jsonResponse(
        {
          success: false,
          error: normalized.message,
          errorCode: normalized.errorCode,
          results: searchResults,
        },
        500
      );
    }
  }

  async status(_request) {
    const config = await getConfig(this.env);
    const todayCount = await getTodayApplicationCount(this.env);
    const cookies = await getWantedSession(this.env);

    const platformStatus = {};
    for (const platform of SUPPORTED_PLATFORMS) {
      const count = await getTodayApplicationCount(this.env, platform);
      platformStatus[platform] = {
        todayApplications: count,
        authenticated: platform === 'wanted' ? !!cookies : true,
      };
    }

    return this.jsonResponse({
      enabled: config.autoApplyEnabled,
      supportedPlatforms: SUPPORTED_PLATFORMS,
      todayApplications: todayCount,
      maxDaily: config.maxDailyApplications,
      remaining: Math.max(0, config.maxDailyApplications - todayCount),
      minMatchScore: config.minMatchScore,
      keywords: config.keywords,
      platforms: platformStatus,
    });
  }

  async configure(request) {
    if (!this.db) {
      return this.jsonResponse({ error: 'Database not configured' }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();

    const updates = [];

    if (body.enabled !== undefined) {
      updates.push(['auto_apply_enabled', String(body.enabled)]);
    }
    if (body.maxDaily !== undefined) {
      updates.push(['max_daily_applications', String(body.maxDaily)]);
    }
    if (body.minScore !== undefined) {
      updates.push(['min_match_score', String(body.minScore)]);
    }
    if (body.keywords !== undefined) {
      updates.push(['auto_apply_keywords', JSON.stringify(body.keywords)]);
    }

    for (const [key, value] of updates) {
      await this.db
        .prepare(
          'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
        )
        .bind(key, value, now)
        .run();
    }

    const config = await getConfig(this.env);
    return this.jsonResponse({
      success: true,
      config,
    });
  }
}

export default AutoApplyHandler;
