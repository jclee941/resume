import { WorkflowEntrypoint } from 'cloudflare:workers';
import { validateSession } from './session.js';
import { crawlLinkedIn, crawlPlatform, crawlRemember, crawlWanted } from './platform-crawlers.js';
import { collectDeduplicatedJobs, getMatchingConfig, matchJobs } from './job-processing.js';
import { saveMatchedJobs } from './job-storage.js';
import { notifyJobCrawlingResults, sendNotification } from './notifications.js';

/**
 * Job Crawling Workflow
 *
 * Multi-platform job search with automatic retry and state persistence.
 * Each platform runs as a separate step - failures don't affect other platforms.
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

    const authStatus = await this.#validatePlatforms(step, platforms);
    await this.#crawlPlatforms(step, platforms, authStatus, searchCriteria, results);

    const processedJobs = await step.do(
      'process-results',
      { retries: { limit: 2, delay: '5 seconds' }, timeout: '2 minutes' },
      async () => collectDeduplicatedJobs(results)
    );
    const matchedJobs = await step.do(
      'match-jobs',
      { retries: { limit: 2, delay: '5 seconds' }, timeout: '2 minutes' },
      async () => matchJobs(this.env, processedJobs)
    );

    if (!dryRun && matchedJobs.length > 0) {
      await step.do(
        'save-results',
        { retries: { limit: 3, delay: '5 seconds' }, timeout: '2 minutes' },
        async () => saveMatchedJobs(this.env, matchedJobs)
      );
    }

    await step.do(
      'notify',
      { retries: { limit: 2, delay: '10 seconds' }, timeout: '30 seconds' },
      async () => notifyJobCrawlingResults(this.env, platforms, results, matchedJobs)
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

  async #validatePlatforms(step, platforms) {
    return await step.do(
      'validate-auth',
      { retries: { limit: 2, delay: '5 seconds', backoff: 'linear' }, timeout: '30 seconds' },
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
  }

  async #crawlPlatforms(step, platforms, authStatus, searchCriteria, results) {
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
        async () => this.crawlPlatform(platform, searchCriteria)
      );
      results.platforms[platform] = platformResult;
      results.totalJobs += platformResult.jobs?.length || 0;

      if (platforms.indexOf(platform) < platforms.length - 1) {
        await step.sleep('rate-limit-pause', '30 seconds');
      }
    }
  }

  async validateSession(_platform, session) {
    return validateSession(this.env, session);
  }

  async crawlPlatform(platform, criteria) {
    return crawlPlatform(this.env, platform, criteria);
  }

  async crawlWanted(criteria) {
    return crawlWanted(this.env, criteria);
  }

  async crawlLinkedIn(criteria) {
    return crawlLinkedIn(criteria);
  }

  async crawlRemember(criteria) {
    return crawlRemember(criteria);
  }

  async getMatchingConfig() {
    return getMatchingConfig(this.env);
  }

  async sendNotification(message) {
    await sendNotification(this.env, message);
  }
}
