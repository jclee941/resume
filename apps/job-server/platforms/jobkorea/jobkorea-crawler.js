/**
 * JobKorea Crawler - 잡코리아 채용공고 크롤러
 * Next.js SPA 전환으로 인해 rebrowser-puppeteer 사용 (stealth CDP patches)
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { withStealthBrowser } from '../../src/crawlers/browser-utils.js';
import { parseJobKoreaProfile } from './jobkorea-profile-parser.js';
import {
  applyJobKoreaCookiesToPage,
  extractJobKoreaSearchJobs,
  normalizeJobKoreaJob,
} from './jobkorea-crawler-utils.js';

/**
 * @typedef {import('../../src/crawlers/base-crawler.js').BaseCrawlerOptions & {
 *   resumeNo?: string;
 *   browserRunner?: <T>(action: (page: import('puppeteer').Page) => Promise<T>) => Promise<T>;
 * }} JobKoreaCrawlerOptions
 */

/**
 * @typedef {Object} JobKoreaSearchParams
 * @property {string} [keyword]
 * @property {string | number} [page]
 * @property {number} [limit]
 * @property {string} [sort]
 * @property {number} [experience]
 * @property {number} [experienceMax]
 * @property {string} [location]
 * @property {string} [jobCategory]
 */

export class JobKoreaCrawler extends BaseCrawler {
  /**
   * @param {JobKoreaCrawlerOptions} [options]
   */
  constructor(options = {}) {
    super('jobkorea', {
      baseUrl: 'https://www.jobkorea.co.kr',
      rateLimit: 2000,
      ...options,
    });
    /** @type {string} */
    this.resumeNo = options.resumeNo || process.env.JOBKOREA_RNO || '';
    /** @type {<T>(action: (page: import('puppeteer').Page) => Promise<T>) => Promise<T>} */
    this.browserRunner = options.browserRunner || withStealthBrowser;
  }

  /**
   * @param {JobKoreaSearchParams} params
   */
  buildSearchQuery(params) {
    const query = new URLSearchParams({
      stext: params.keyword || '',
      tabType: 'recruit',
      Page_No: String(params.page || 1),
      Page_Count: String(Math.min(params.limit || 20, 50)),
      orderBy: params.sort || 'RegDtDesc',
    });

    if (params.experience !== undefined) {
      query.set('careerType', params.experience === 0 ? 'N' : 'E');
      if (params.experience > 0) {
        query.set('careerMin', String(params.experience));
        query.set('careerMax', String(params.experienceMax || params.experience + 5));
      }
    }

    if (params.location) {
      query.set('local', this.getLocationCode(params.location));
    }

    if (params.jobCategory) {
      query.set('duty', params.jobCategory);
    }

    return query.toString();
  }

  /**
   * @param {string} location
   */
  getLocationCode(location) {
    /** @type {Record<string, string>} */
    const locationMap = {
      seoul: 'I000',
      서울: 'I000',
      gyeonggi: 'B000',
      경기: 'B000',
      pangyo: 'B041',
      판교: 'B041',
      busan: 'H000',
      부산: 'H000',
    };
    return locationMap[location.toLowerCase()] || '';
  }

  /**
   * @param {JobKoreaSearchParams} [params]
   */
  async searchJobs(params = {}) {
    try {
      const jobs = await this.searchWithBrowser(params);
      return {
        success: true,
        source: 'jobkorea',
        total: jobs.length,
        hasMore: jobs.length >= (params.limit || 20),
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'jobkorea',
        error: error instanceof Error ? error.message : String(error),
        jobs: [],
      };
    }
  }

  /**
   * @param {JobKoreaSearchParams} params
   */
  async searchWithBrowser(params) {
    return withStealthBrowser(async (page) => {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/Search/?${query}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page
        .waitForSelector('a[href*="/Recruit/GI_Read/"]', {
          timeout: 10000,
        })
        .catch((err) => {
          console.warn(`⚠️ JobKorea: waitForSelector timeout — ${err.message}`);
        });

      const jobs = await extractJobKoreaSearchJobs(page);
      return jobs.map((job) => this.normalizeJob(job));
    });
  }

  /**
   * @param {string} jobId
   */
  async getJobDetail(jobId) {
    try {
      const job = await withStealthBrowser(async (page) => {
        const url = `${this.baseUrl}/Recruit/GI_Read/${jobId}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 3000));

        return page.evaluate((jid) => {
          // Next.js SPA — client-rendered, use multiple fallbacks
          let title = document.querySelector('h1')?.textContent?.trim() || '';
          let company =
            document.querySelector('a[href*="/company/"]')?.textContent?.trim() ||
            document.querySelector('h2')?.textContent?.trim() ||
            '';

          // Fallback: parse from page title "회사명 채용 - 포지션 | 잡코리아"
          if (!title || !company) {
            const pageTitle = document.title || '';
            const match = pageTitle.match(/^(.+?)\s*채용\s*-\s*(.+?)\s*\|/);
            if (match) {
              if (!company) company = match[1].trim();
              if (!title) title = match[2].trim();
            }
          }

          const descEl =
            document.querySelector('[class*="content"]') ||
            document.querySelector('[class*="description"]');
          const description = descEl?.textContent?.trim() || '';

          return { id: jid, position: title, company, description };
        }, jobId);
      });

      return {
        success: true,
        source: 'jobkorea',
        job: this.normalizeJob(job),
      };
    } catch (error) {
      return {
        success: false,
        source: 'jobkorea',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * @param {string} [resumeNo]
   */
  async getProfile(resumeNo = this.resumeNo) {
    if (!this.cookies) {
      return {
        success: false,
        source: 'jobkorea',
        error: 'Authentication required',
        status: 'AUTH_REQUIRED',
      };
    }

    if (!resumeNo) {
      return {
        success: false,
        source: 'jobkorea',
        status: 'RESUME_NO_REQUIRED',
        error: 'JobKorea resume number is required',
        profile: null,
      };
    }

    const sourceUrl = `${this.baseUrl}/User/Resume/View?rNo=${encodeURIComponent(resumeNo)}`;

    try {
      const profile = await this.browserRunner(async (page) => {
        await this.applyCookiesToPage(page);
        await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const currentUrl = typeof page.url === 'function' ? page.url() : sourceUrl;
        if (/\/Login(?:\/|\?|$)/i.test(currentUrl)) {
          return null;
        }

        await page
          .waitForSelector('body', {
            timeout: 10000,
          })
          .catch(() => {});

        const html =
          typeof page.content === 'function'
            ? await page.content()
            : await page.evaluate(() => document.documentElement.outerHTML);

        return parseJobKoreaProfile(html, { sourceUrl: currentUrl || sourceUrl, resumeNo });
      });

      if (!profile) {
        return {
          success: false,
          source: 'jobkorea',
          status: 'SESSION_EXPIRED',
          error: 'JobKorea session expired or login redirect detected',
          profile: null,
        };
      }

      return {
        success: true,
        source: 'jobkorea',
        profile,
      };
    } catch (error) {
      return {
        success: false,
        source: 'jobkorea',
        status: 'SCRAPE_FAILED',
        error: error instanceof Error ? error.message : String(error),
        profile: null,
      };
    }
  }

  /**
   * @param {import('puppeteer').Page} page
   */
  async applyCookiesToPage(page) {
    return applyJobKoreaCookiesToPage(page, this.cookies);
  }

  /**
   * @param {import('./jobkorea-crawler-utils.js').RawJobKoreaJob} rawJob
   */
  normalizeJob(rawJob) {
    return normalizeJobKoreaJob(rawJob, this.baseUrl);
  }
}

export default JobKoreaCrawler;
