import { WantedClient } from '../services/wanted-client.js';
import { LinkedInClient } from '../services/linkedin-client.js';
import { RememberClient } from '../services/remember-client.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

const DEFAULT_KEYWORDS = ['DevOps', 'SRE', 'Platform Engineer', '보안'];
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

  async getWantedSession() {
    if (!this.sessions) return null;

    let session = await this.sessions.get('session:wanted', { type: 'text' });
    if (!session) {
      session = await this.sessions.get('wanted:session', { type: 'json' });
      if (session?.cookies) {
        return session.cookies;
      }
      return null;
    }

    return session;
  }

  async saveWantedSession(cookies, email = null) {
    if (!this.sessions) return false;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await this.sessions.put(
      'wanted:session',
      JSON.stringify({
        cookies,
        email,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
    );
    return true;
  }

  async getConfig() {
    if (!this.db) {
      return {
        autoApplyEnabled: false,
        maxDailyApplications: 10,
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        keywords: DEFAULT_KEYWORDS,
      };
    }

    const rows = await this.db
      .prepare('SELECT key, value FROM config WHERE key IN (?, ?, ?, ?)')
      .bind(
        'auto_apply_enabled',
        'max_daily_applications',
        'min_match_score',
        'auto_apply_keywords'
      )
      .all();

    const config = {};
    for (const row of rows.results || []) {
      config[row.key] = row.value;
    }

    return {
      autoApplyEnabled: config.auto_apply_enabled === 'true',
      maxDailyApplications: parseInt(config.max_daily_applications) || 10,
      minMatchScore: parseInt(config.min_match_score) || 70,
      keywords: config.auto_apply_keywords
        ? JSON.parse(config.auto_apply_keywords)
        : DEFAULT_KEYWORDS,
    };
  }

  async getTodayApplicationCount(platform = null) {
    if (!this.db) return 0;

    const today = new Date().toISOString().split('T')[0];
    let query;
    let params;

    if (platform) {
      query =
        'SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = ? AND source = ?';
      params = [today, platform];
    } else {
      query = 'SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = ?';
      params = [today];
    }

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .first();
    return result?.count || 0;
  }

  async isAlreadyApplied(jobId, source) {
    if (!this.db) return false;

    const result = await this.db
      .prepare('SELECT id FROM applications WHERE job_id = ? AND source = ?')
      .bind(String(jobId), source)
      .first();

    return !!result;
  }

  async recordApplication(job, source, status, result = null) {
    if (!this.db) return;

    const now = new Date().toISOString();
    const appId = `${source}_${job.sourceId || job.id}`;

    await this.db
      .prepare(
        `INSERT INTO applications 
        (id, job_id, source, source_url, position, company, location, match_score, status, priority, notes, created_at, updated_at, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at`
      )
      .bind(
        appId,
        String(job.sourceId || job.id),
        source,
        job.sourceUrl || job.url || '',
        job.position || job.title || '',
        job.company || '',
        job.location || '',
        job.matchScore || 0,
        status,
        'medium',
        result ? JSON.stringify(result) : null,
        now,
        now,
        status === 'applied' ? now : null
      )
      .run();
  }

  calculateMatchScore(job, keywords) {
    let score = 50;

    const titleLower = (job.position || job.title || '').toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    const techStack = job.techStack || job.skills || [];
    const skillsLower = techStack.map((s) =>
      (typeof s === 'string' ? s : s.name || '').toLowerCase()
    );

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (titleLower.includes(kw)) {
        score += 15;
      }
      if (skillsLower.some((s) => s.includes(kw))) {
        score += 10;
      }
      if (descLower.includes(kw)) {
        score += 5;
      }
    }

    const preferredSkills = [
      'kubernetes',
      'docker',
      'terraform',
      'aws',
      'devops',
      'security',
      'ci/cd',
      'linux',
    ];
    for (const skill of preferredSkills) {
      if (titleLower.includes(skill) || skillsLower.some((s) => s.includes(skill))) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  async run(request) {
    const body = await request.json().catch(() => ({}));
    const {
      dryRun = true,
      maxApplications = null,
      keywords = null,
      platforms = ['wanted', 'linkedin', 'remember'],
    } = body;

    const config = await this.getConfig();

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

    const todayCount = await this.getTodayApplicationCount();
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
        const wantedCookies = await this.getWantedSession();
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
        matchScore: this.calculateMatchScore(job, searchKeywords),
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

        const alreadyApplied = await this.isAlreadyApplied(job.sourceId || job.id, job.source);
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
          await this.recordApplication(job, job.source, 'pending');
          appliedCount++;
          if (searchResults.byPlatform[job.source]) {
            searchResults.byPlatform[job.source].applied++;
          }
        } else {
          if (job.source === 'wanted') {
            try {
              const cookies = await this.getWantedSession();
              if (!cookies) {
                searchResults.skipped++;
                continue;
              }
              this.clients.wanted.setCookies(cookies);
              const result = await this.clients.wanted.apply(job.sourceId || job.id);
              await this.recordApplication(job, job.source, 'applied', result);
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
              await this.recordApplication(job, job.source, 'error', { error: normalized.message });
            }
          } else {
            await this.recordApplication(job, job.source, 'pending');
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
    const config = await this.getConfig();
    const todayCount = await this.getTodayApplicationCount();
    const cookies = await this.getWantedSession();

    const platformStatus = {};
    for (const platform of SUPPORTED_PLATFORMS) {
      const count = await this.getTodayApplicationCount(platform);
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

    const config = await this.getConfig();
    return this.jsonResponse({
      success: true,
      config,
    });
  }
}

export default AutoApplyHandler;
