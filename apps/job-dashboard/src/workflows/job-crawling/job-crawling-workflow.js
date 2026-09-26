import { WorkflowEntrypoint } from 'cloudflare:workers';
import { validateSession } from './session.js';
import { crawlLinkedIn, crawlPlatform, crawlRemember, crawlWanted } from './platform-crawlers.js';
import { collectDeduplicatedJobs, getMatchingConfig, matchJobs } from './job-processing.js';
import { saveMatchedJobs } from './job-storage.js';
import { notifyJobCrawlingResults, sendNotification } from './notifications.js';

/**
 * `SESSIONS.get` comes first so KV reads resolve to the plain string overload.
 * @typedef {{ SESSIONS: { get(key: string): Promise<string | null> } }
 *   & import('./session.js').SessionEnv
 *   & NonNullable<Parameters<typeof getMatchingConfig>[0]>
 *   & import('./job-storage.js').StorageEnv
 *   & import('../../services/notifications.js').NotificationEnv} JobCrawlingEnv
 *
 * @typedef {{
 *   platforms?: string[];
 *   searchCriteria?: Record<string, unknown>;
 *   dryRun?: boolean;
 * }} JobCrawlingParams
 *
 * @typedef {Record<string, { authenticated: boolean; sessionValid: boolean }>} PlatformAuthStatus
 *
 * @typedef {{
 *   startedAt: string;
 *   platforms: Record<string, Awaited<ReturnType<typeof crawlPlatform>>>;
 *   totalJobs: number;
 *   errors: Array<{ platform: string; error: string }>;
 * }} JobCrawlingResults
 */

/**
 * Job Crawling Workflow
 *
 * Multi-platform job search with automatic retry and state persistence.
 * Each platform runs as a separate step - failures don't affect other platforms.
 *
 * @extends {WorkflowEntrypoint<JobCrawlingEnv, JobCrawlingParams>}
 */
export class JobCrawlingWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<JobCrawlingParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   */
  async run(event, step) {
    const {
      platforms = ['wanted', 'linkedin', 'remember'],
      searchCriteria = {},
      dryRun = false,
    } = event.payload;
    /** @type {JobCrawlingResults} */
    const results = {
      startedAt: new Date().toISOString(),
      platforms: {},
      totalJobs: 0,
      errors: [],
    };

    const authStatus = await this.#validatePlatforms(step, platforms);
    const crawledAny = await this.#crawlPlatforms(
      step,
      platforms,
      authStatus,
      searchCriteria,
      results
    );

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

    if (!dryRun && crawledAny) {
      if (matchedJobs.length > 0) {
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
    }

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

  /**
   * @param {import('cloudflare:workers').WorkflowStep} step
   * @param {string[]} platforms
   * @returns {Promise<PlatformAuthStatus>}
   */
  async #validatePlatforms(step, platforms) {
    return await step.do(
      'validate-auth',
      { retries: { limit: 2, delay: '5 seconds', backoff: 'linear' }, timeout: '30 seconds' },
      async () => {
        /** @type {PlatformAuthStatus} */
        const status = {};
        for (const platform of platforms) {
          if (platform !== 'wanted') {
            status[platform] = { authenticated: true, sessionValid: true };
            continue;
          }
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

  /**
   * @param {import('cloudflare:workers').WorkflowStep} step
   * @param {string[]} platforms
   * @param {PlatformAuthStatus} authStatus
   * @param {Record<string, unknown>} searchCriteria
   * @param {JobCrawlingResults} results
   * @returns {Promise<boolean>}
   */
  async #crawlPlatforms(step, platforms, authStatus, searchCriteria, results) {
    let crawledAny = false;
    for (const platform of platforms) {
      const status = authStatus[platform];
      if (!status?.authenticated || !status.sessionValid) {
        const reason = status?.authenticated ? 'invalid Wanted session' : 'Wanted session missing';
        results.errors.push({ platform, error: `Authentication required: ${reason}` });
        continue;
      }

      crawledAny = true;
      try {
        const platformResult = await step.do(
          `crawl-${platform}`,
          {
            retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
            timeout: '5 minutes',
          },
          async () => {
            const result = await this.crawlPlatform(platform, searchCriteria);
            if (result.error) {
              throw new Error(result.error);
            }
            return result;
          }
        );
        results.platforms[platform] = platformResult;
        results.totalJobs += platformResult.jobs?.length || 0;
      } catch (error) {
        results.errors.push({
          platform,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (platforms.indexOf(platform) < platforms.length - 1) {
        await step.sleep('rate-limit-pause', '30 seconds');
      }
    }
    return crawledAny;
  }

  /**
   * @param {string} _platform
   * @param {string} session
   * @returns {Promise<boolean>}
   */
  async validateSession(_platform, session) {
    return validateSession(this.env, session);
  }

  /**
   * @param {string} platform
   * @param {Record<string, unknown>} criteria
   */
  async crawlPlatform(platform, criteria) {
    return crawlPlatform(this.env, platform, criteria);
  }

  /**
   * @param {Record<string, unknown>} criteria
   */
  async crawlWanted(criteria) {
    return crawlWanted(this.env, criteria);
  }

  /**
   * @param {Record<string, unknown>} criteria
   */
  async crawlLinkedIn(criteria) {
    return crawlLinkedIn(criteria);
  }

  /**
   * @param {Record<string, unknown>} criteria
   */
  async crawlRemember(criteria) {
    return crawlRemember(criteria);
  }

  async getMatchingConfig() {
    return getMatchingConfig(this.env);
  }

  /**
   * @param {string} message
   */
  async sendNotification(message) {
    await sendNotification(this.env, message);
  }
}
