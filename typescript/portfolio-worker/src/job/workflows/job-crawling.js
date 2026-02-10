import { WorkflowEntrypoint } from 'cloudflare:workers';

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
            matchScore: this.calculateMatchScore(job, config),
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
        if (matchedJobs.length === 0) return { notified: false };

        const topJobs = matchedJobs
          .slice(0, 5)
          .map((j) => `• ${j.company} - ${j.position} (${j.matchScore}%)`)
          .join('\n');

        await this.sendSlackNotification({
          text: `🔍 Job Search Complete: ${matchedJobs.length} matches`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🔍 Job Search Results' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Platforms*: ${platforms.join(', ')}\n*Found*: ${results.totalJobs} jobs\n*Matched*: ${matchedJobs.length} jobs\n\n*Top Matches*:\n${topJobs}`,
              },
            },
          ],
        });

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
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    // LinkedIn Jobs API (requires different auth)
    const session = await this.env.SESSIONS.get('auth:linkedin');
    if (!session) return { jobs: [], error: 'No session' };

    // LinkedIn crawling implementation
    return { jobs: [], message: 'LinkedIn crawling placeholder' };
  }

  async crawlRemember(_criteria) {
    // Remember.co.kr API
    const session = await this.env.SESSIONS.get('auth:remember');
    if (!session) return { jobs: [], error: 'No session' };

    // Remember crawling implementation
    return { jobs: [], message: 'Remember crawling placeholder' };
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

  calculateMatchScore(job, config) {
    let score = 50; // Base score

    // Preferred companies bonus
    if (
      config.preferredCompanies?.some((c) => job.company.toLowerCase().includes(c.toLowerCase()))
    ) {
      score += 30;
    }

    // Skills match
    const requiredSkills = config.skills || [];
    const jobText = `${job.position} ${job.description || ''}`.toLowerCase();
    const matchedSkills = requiredSkills.filter((skill) => jobText.includes(skill.toLowerCase()));
    score += (matchedSkills.length / Math.max(requiredSkills.length, 1)) * 20;

    return Math.min(100, Math.round(score));
  }

  async sendSlackNotification(message) {
    const webhookUrl = this.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
