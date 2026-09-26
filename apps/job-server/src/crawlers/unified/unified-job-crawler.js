import { SessionManager } from '../../shared/services/session/index.js';
import { convertParams, deduplicateJobs } from './job-normalization.js';
import { DEFAULT_CRAWLER_SOURCES, createPlatformCrawlers } from './platform-crawlers.js';
import {
  search,
  searchAll,
  searchRecommended,
  searchSource,
  searchWithMatching,
} from './search-operations.js';
import {
  generateProposalsFromCrawlerResult,
  writeProposalFiles,
} from '../../sync/proposal-generator.js';

/**
 * @typedef {import('./search-operations.js').PlatformCrawler} PlatformCrawler
 * @typedef {import('./search-operations.js').SearchAllParams} SearchAllParams
 * @typedef {import('./search-operations.js').SearchOptions} SearchOptions
 *
 * @typedef {Object} UnifiedJobCrawlerOptions
 * @property {string[]} [sources]
 * @property {string} [resumePath]
 * @property {Record<string, unknown>} [wanted]
 * @property {Record<string, unknown>} [jobkorea]
 * @property {Record<string, unknown>} [saramin]
 * @property {Record<string, unknown>} [linkedin]
 * @property {Record<string, unknown>} [remember]
 * @property {Record<string, unknown>} [rocketpunch]
 * @property {Record<string, unknown>} [programmers]
 * @property {Record<string, unknown>} [jumpit]
 * @property {Record<string, unknown>} [rallit]
 */

export class UnifiedJobCrawler {
  /**
   * @param {UnifiedJobCrawlerOptions} [options]
   */
  constructor(options = {}) {
    /** @type {Record<string, PlatformCrawler>} */
    this.crawlers = /** @type {Record<string, PlatformCrawler>} */ (
      createPlatformCrawlers(options)
    );
    this.loadPlatformSessions();
    /** @type {string[]} */
    this.enabledSources = options.sources || DEFAULT_CRAWLER_SOURCES;
    /** @type {string | undefined} */
    this.resumePath = options.resumePath;
  }

  loadPlatformSessions() {
    const sessions = /** @type {Record<string, { cookies?: unknown }>} */ (SessionManager.load());
    Object.keys(this.crawlers).forEach((platform) => {
      if (sessions[platform]?.cookies) {
        this.crawlers[platform].cookies = sessions[platform].cookies;
      }
    });
  }

  /**
   * @param {SearchAllParams} [params]
   */
  async searchAll(params = {}) {
    return searchAll(this, params);
  }

  /**
   * @param {string} source
   * @param {Record<string, unknown> & { keyword?: string }} params
   */
  async searchSource(source, params) {
    return searchSource(this, source, params);
  }

  /**
   * @param {string} source
   * @param {Record<string, unknown>} params
   */
  convertParams(source, params) {
    return convertParams(source, params);
  }

  /**
   * @param {import('./job-normalization.js').DeduplicableJob[]} jobs
   */
  deduplicateJobs(jobs) {
    return deduplicateJobs(jobs);
  }

  /**
   * @param {string} platform
   * @param {string | string[]} keywords
   * @param {SearchOptions} [options]
   */
  async search(platform, keywords, options = {}) {
    return search(this, platform, keywords, options);
  }

  /**
   * @param {Record<string, unknown>} [params]
   */
  async searchWithMatching(params = {}) {
    return searchWithMatching(this, params);
  }

  /**
   * @param {Record<string, unknown> & { writeProposals?: boolean; includeProposalItems?: boolean }} [params]
   */
  async searchWithProposals(params = {}) {
    const result = await this.searchWithMatching(params);
    if (!result.success) {
      return result;
    }

    const proposals = generateProposalsFromCrawlerResult(result, {
      crawler: 'unified-job-crawler',
      resumePath: this.resumePath,
    });
    const files = params.writeProposals === false ? [] : writeProposalFiles(proposals);

    return {
      ...result,
      proposals: {
        count: proposals.length,
        files,
        items: params.includeProposalItems ? proposals : undefined,
      },
    };
  }

  /**
   * @param {Record<string, unknown>} [options]
   */
  async searchRecommended(options = {}) {
    return searchRecommended(this, options);
  }

  /**
   * @param {string} companyName
   * @param {Record<string, unknown>} [options]
   */
  async searchByCompany(companyName, options = {}) {
    return this.searchAll({
      keyword: companyName,
      ...options,
    });
  }

  /**
   * @param {string} jobId
   */
  async getJobDetail(jobId) {
    const [source, ...idParts] = jobId.split('_');
    const sourceId = idParts.join('_');
    const crawler = this.crawlers[source];
    if (!crawler) {
      return { success: false, error: `Unknown source: ${source}` };
    }

    return crawler.getJobDetail(sourceId);
  }

  /**
   * @param {string} source
   * @param {unknown} cookies
   */
  setCookies(source, cookies) {
    if (this.crawlers[source]) {
      this.crawlers[source].cookies = cookies;
    }
  }
}

export default UnifiedJobCrawler;
