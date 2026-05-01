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

export class UnifiedJobCrawler {
  constructor(options = {}) {
    this.crawlers = createPlatformCrawlers(options);
    this.loadPlatformSessions();
    this.enabledSources = options.sources || DEFAULT_CRAWLER_SOURCES;
    this.resumePath = options.resumePath;
  }

  loadPlatformSessions() {
    const sessions = SessionManager.load();
    Object.keys(this.crawlers).forEach((platform) => {
      if (sessions[platform]?.cookies) {
        this.crawlers[platform].cookies = sessions[platform].cookies;
      }
    });
  }

  async searchAll(params = {}) {
    return searchAll(this, params);
  }

  async searchSource(source, params) {
    return searchSource(this, source, params);
  }

  convertParams(source, params) {
    return convertParams(source, params);
  }

  deduplicateJobs(jobs) {
    return deduplicateJobs(jobs);
  }

  async search(platform, keywords, options = {}) {
    return search(this, platform, keywords, options);
  }

  async searchWithMatching(params = {}) {
    return searchWithMatching(this, params);
  }

  async searchRecommended(options = {}) {
    return searchRecommended(this, options);
  }

  async searchByCompany(companyName, options = {}) {
    return this.searchAll({
      keyword: companyName,
      ...options,
    });
  }

  async getJobDetail(jobId) {
    const [source, ...idParts] = jobId.split('_');
    const sourceId = idParts.join('_');
    const crawler = this.crawlers[source];
    if (!crawler) {
      return { success: false, error: `Unknown source: ${source}` };
    }

    return crawler.getJobDetail(sourceId);
  }

  setCookies(source, cookies) {
    if (this.crawlers[source]) {
      this.crawlers[source].cookies = cookies;
    }
  }
}

export default UnifiedJobCrawler;
