import { WorkflowEntrypoint } from 'cloudflare:workers';
import { DEFAULT_USER_AGENT } from '../utils/user-agents.js';
import { sendTelegramNotification, escapeHtml } from '../services/notification/telegram.js';
import { calculateMatchScore } from '../handlers/auto-apply/match-scoring.js';

/**
 * Job Crawling Workflow
 *
 * Multi-platform job search with automatic retry and state persistence.
 * Each platform runs as a separate step - failures don't affect other platforms.
 *
 * @param {Object} params
 * @param {string[]} params.platforms - Platforms to crawl ['wanted', 'linkedin', 'remember']
 * @param {Object} params.searchCriteria - Search filters
 * @param {boolean} params.dryRun - If true, don't save results
 */
export class JobCrawlingWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      platforms = ['wanted', 'linkedin', 'remember'],
      searchCriteria = {},
      dryRun = false,
    } = event.payload;

    const results = {
      startedAt: new Date().toISOString(),
      platforms: {},
      totalJobs: 0,
      errors: [],
    };

    // Step 1: Validate authentication for each platform
    const authStatus = await step.do(
      'validate-auth',
      {
        retries: { limit: 2, delay: '5 seconds', backoff: 'linear' },
        timeout: '30 seconds',
      },
      async () => {
        const status = {};
        for (const platform of platforms) {
          const session = await this.env.SESSIONS.get(`auth:${platform}`);
          status[platform] = {
            authenticated: !!session,
            sessionValid: session ? await this.validateSession(platform, session) : false,
          };
        }
        return status;
      }
    );

    // Step 2: Crawl each platform in parallel steps
    for (const platform of platforms) {
      if (!authStatus[platform]?.authenticated) {
        results.errors.push({ platform, error: 'Not authenticated' });
        continue;
      }

      const platformResult = await step.do(
        `crawl-${platform}`,
        {
          retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
          timeout: '5 minutes',
        },
        async () => {
          return await this.crawlPlatform(platform, searchCriteria);
        }
      );

      results.platforms[platform] = platformResult;
      results.totalJobs += platformResult.jobs?.length || 0;

      // Rate limit between platforms
      if (platforms.indexOf(platform) < platforms.length - 1) {
        await step.sleep('rate-limit-pause', '30 seconds');
      }
    }

    // Step 3: Process and deduplicate results
    const processedJobs = await step.do(
      'process-results',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const allJobs = [];
        for (const platform of Object.keys(results.platforms)) {
          const jobs = results.platforms[platform].jobs || [];
          allJobs.push(...jobs.map((job) => ({ ...job, source: platform })));
        }

        // Deduplicate by company + position
        const seen = new Set();
        return allJobs.filter((job) => {
          const key = `${job.company}:${job.position}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    );

    // Step 4: Match jobs against criteria
    const matchedJobs = await step.do(
      'match-jobs',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const config = await this.getMatchingConfig();
        return processedJobs
          .map((job) => ({
            ...job,
            matchScore: calculateMatchScore(job, config),
          }))
          .filter((job) => job.matchScore >= (config.minMatchScore || 70))
          .sort((a, b) => b.matchScore - a.matchScore);
      }
    );

    // Step 5: Save results to database (if not dry run)
    if (!dryRun && matchedJobs.length > 0) {
      await step.do(
        'save-results',
        {
          retries: { limit: 3, delay: '5 seconds' },
          timeout: '2 minutes',
        },
        async () => {
          const stmt = this.env.DB.prepare(`
            INSERT INTO job_search_results (job_id, company, position, source, match_score, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (job_id) DO UPDATE SET match_score = excluded.match_score, updated_at = datetime('now')
          `);

          const batch = matchedJobs
            .slice(0, 50)
            .map((job) =>
              stmt.bind(
                job.id || `${job.source}-${Date.now()}`,
                job.company,
                job.position,
                job.source,
                job.matchScore,
                JSON.stringify(job)
              )
            );

          await this.env.DB.batch(batch);
          return { saved: batch.length };
        }
      );
    }

    // Step 6: Send notification
    await step.do(
      'notify',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const topJobs =
          matchedJobs
            .slice(0, 5)
            .map(
              (j) => `  • ${escapeHtml(j.company)} - ${escapeHtml(j.position)} (${j.matchScore}%)`
            )
            .join('\n') || 'None';
        await sendTelegramNotification(
          this.env,
          '🔍 <b>Job Search Results</b>\n\n' +
            `<b>Platforms</b>: ${escapeHtml(platforms.join(', '))}\n` +
            `<b>Found</b>: ${results.totalJobs} jobs\n` +
            `<b>Matched</b>: ${matchedJobs.length} jobs\n\n` +
            `<b>Top Matches</b>:\n${topJobs}`
        );
        return { notified: true };
      }
    );

    return {
      success: true,
      completedAt: new Date().toISOString(),
      summary: {
        platforms: Object.keys(results.platforms),
        totalFound: results.totalJobs,
        matched: matchedJobs.length,
        errors: results.errors,
      },
      jobs: matchedJobs,
    };
  }

  async validateSession(platform, session) {
    // Platform-specific session validation
    try {
      const parsed = JSON.parse(session);
      if (!parsed.expiresAt) return true;
      return new Date(parsed.expiresAt) > new Date();
    } catch {
      return false;
    }
  }

  async crawlPlatform(platform, criteria) {
    // Platform-specific crawling logic
    // This delegates to the appropriate client
    const clients = {
      wanted: () => this.crawlWanted(criteria),
      linkedin: () => this.crawlLinkedIn(criteria),
      remember: () => this.crawlRemember(criteria),
    };

    const crawler = clients[platform];
    if (!crawler) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    return await crawler();
  }

  async crawlWanted(_criteria) {
    // Wanted.co.kr API crawling
    const session = await this.env.SESSIONS.get('auth:wanted');
    if (!session) return { jobs: [], error: 'No session' };

    try {
      const response = await fetch('https://www.wanted.co.kr/api/v4/jobs', {
        headers: {
          Cookie: session,
          'User-Agent': DEFAULT_USER_AGENT,
        },
      });

      if (!response.ok) {
        return { jobs: [], error: `API error: ${response.status}` };
      }

      const data = await response.json();
      return {
        jobs: (data.data || []).map((job) => ({
          id: `wanted-${job.id}`,
          company: job.company?.name || 'Unknown',
          position: job.position || 'Unknown',
          url: `https://www.wanted.co.kr/wd/${job.id}`,
          location: job.address?.location || '',
          experience: job.years || '',
        })),
      };
    } catch (error) {
      return { jobs: [], error: error.message };
    }
  }

  async crawlLinkedIn(_criteria) {
    try {
      const keyword = encodeURIComponent(_criteria?.keyword || _criteria?.keywords || '');
      const location = encodeURIComponent(_criteria?.location || '');
      const response = await fetch(
        `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&f_TPR=r604800&position=0&pageNum=0`,
        {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
          },
        }
      );

      if (!response.ok) {
        return { jobs: [], error: `API error: ${response.status}` };
      }

      const html = await response.text();
      const jobPattern =
        /<div[^>]*class="[^"]*base-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
      const jobs = [];

      for (;;) {
        const match = jobPattern.exec(html);
        if (match === null) break;

        const sourceId = (match[1] || '').trim();
        const position = (match[2] || '').trim();
        const company = (match[3] || '').trim();
        if (!sourceId) continue;

        jobs.push({
          id: `linkedin-${sourceId}`,
          company,
          position,
          url: `https://www.linkedin.com/jobs/view/${sourceId}`,
          location: _criteria?.location || '',
          experience: '',
        });
      }

      return { jobs };
    } catch (error) {
      return { jobs: [], error: error.message };
    }
  }

  async crawlRemember(_criteria) {
    try {
      const keyword = (_criteria?.keyword || _criteria?.keywords || '').trim();
      const headers = {
        Accept: 'application/json',
        Origin: 'https://career.rememberapp.co.kr',
        Referer: 'https://career.rememberapp.co.kr/job/postings',
        'User-Agent': DEFAULT_USER_AGENT,
      };

      const response = keyword
        ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `page=1&per=20&search=${encodeURIComponent(keyword)}`,
          })
        : await fetch(
            'https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20',
            {
              method: 'GET',
              headers,
            }
          );

      if (!response.ok) {
        return { jobs: [], error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const rawJobs = Array.isArray(data?.data?.job_postings)
        ? data.data.job_postings
        : Array.isArray(data?.data)
          ? data.data
          : [];

      return {
        jobs: rawJobs
          .filter((job) => job?.id)
          .map((job) => ({
            id: `remember-${job.id}`,
            company: job.organization?.name || job.company?.name || '',
            position: job.title || '',
            url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
            location: job.location?.name || job.address?.full_location || '',
            experience: job.career_period || '',
          })),
      };
    } catch (error) {
      return { jobs: [], error: error.message };
    }
  }

  async getMatchingConfig() {
    try {
      const config = await this.env.DB.prepare(
        "SELECT value FROM config WHERE key = 'auto_apply_config'"
      ).first();
      return config?.value ? JSON.parse(config.value) : { minMatchScore: 70 };
    } catch {
      return { minMatchScore: 70 };
    }
  }


  async sendNotification(message) {
    await sendTelegramNotification(this.env, message);
  }
}
