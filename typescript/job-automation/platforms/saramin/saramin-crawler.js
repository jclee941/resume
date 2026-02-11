/**
 * Saramin Crawler - 사람인 채용공고 크롤러
 * rebrowser-puppeteer 사용 (stealth CDP patches)
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { withStealthBrowser } from '../../src/crawlers/browser-utils.js';

export class SaraminCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('saramin', {
      baseUrl: 'https://www.saramin.co.kr',
      rateLimit: 2000,
      ...options,
    });
  }

  buildSearchQuery(params) {
    const query = new URLSearchParams({
      searchType: 'search',
      searchword: params.keyword || '',
      recruitPage: params.page || 1,
      recruitPageCount: Math.min(params.limit || 20, 50),
      recruitSort: params.sort || 'relation',
    });

    if (params.experience !== undefined) {
      if (params.experience === 0) {
        query.set('exp_cd', '1');
      } else {
        query.set('exp_cd', '2');
        query.set('exp_min', params.experience);
        query.set('exp_max', params.experienceMax || params.experience + 5);
      }
    }

    if (params.location) {
      query.set('loc_cd', this.getLocationCode(params.location));
    }

    if (params.jobCategory) {
      query.set('cat_cd', params.jobCategory);
    }

    return query.toString();
  }

  getLocationCode(location) {
    const locationMap = {
      seoul: '101000',
      서울: '101000',
      gyeonggi: '102000',
      경기: '102000',
      pangyo: '102000,102050',
      판교: '102000,102050',
      busan: '106000',
      부산: '106000',
    };
    return locationMap[location.toLowerCase()] || '';
  }

  async searchJobs(params = {}) {
    try {
      const jobs = await this.searchWithBrowser(params);
      return {
        success: true,
        source: 'saramin',
        total: jobs.length,
        hasMore: jobs.length >= (params.limit || 20),
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'saramin',
        error: error.message,
        jobs: [],
      };
    }
  }

  async searchWithBrowser(params) {
    return withStealthBrowser(async (page) => {
      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/zf_user/search/recruit?${query}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      await page
        .waitForSelector('.item_recruit, [class*="job_item"]', { timeout: 10000 })
        .catch(() => {});

      const jobs = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('.item_recruit, [class*="job_item"], article');

        items.forEach((item) => {
          const linkEl = item.querySelector('a[href*="rec_idx"]');
          const titleEl = item.querySelector('.job_tit, [class*="title"]');
          const companyEl = item.querySelector('.corp_name, [class*="company"]');
          const locationEl = item.querySelector('.job_condition span, [class*="location"]');

          if (linkEl && titleEl) {
            const href = linkEl.getAttribute('href') || '';
            const idMatch = href.match(/rec_idx=(\d+)/);

            results.push({
              id: idMatch ? idMatch[1] : Date.now().toString(),
              position: titleEl.textContent?.trim() || '',
              company: companyEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              url: href.startsWith('http') ? href : `https://www.saramin.co.kr${href}`,
            });
          }
        });

        return results;
      });

      return jobs.map((job) => this.normalizeJob(job));
    });
  }

  async getJobDetail(jobId) {
    try {
      const job = await withStealthBrowser(async (page) => {
        const url = `${this.baseUrl}/zf_user/jobs/relay/view?rec_idx=${jobId}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        return page.evaluate((jid) => {
          const title = document.querySelector('.tit_job, h1')?.textContent?.trim() || '';
          const company = document.querySelector('[class*="company"]')?.textContent?.trim() || '';
          const description =
            document.querySelector('.job_contents, [class*="content"]')?.textContent?.trim() || '';

          return { id: jid, position: title, company, description };
        }, jobId);
      });

      return {
        success: true,
        source: 'saramin',
        job: this.normalizeJob(job),
      };
    } catch (error) {
      return {
        success: false,
        source: 'saramin',
        error: error.message,
      };
    }
  }

  async getProfile() {
    if (!this.cookies) {
      return { success: false, error: 'Authentication required' };
    }

    return {
      success: true,
      profile: { name: null, email: null, careers: [], skills: [] },
    };
  }

  normalizeJob(rawJob) {
    return {
      id: `saramin_${rawJob.id}`,
      sourceId: rawJob.id,
      source: 'saramin',
      sourceUrl: rawJob.url || `${this.baseUrl}/zf_user/jobs/relay/view?rec_idx=${rawJob.id}`,
      position: rawJob.position || '',
      company: rawJob.company || '',
      companyId: rawJob.companyId || '',
      location: rawJob.location || '',
      experienceMin: rawJob.experienceMin || 0,
      experienceMax: rawJob.experienceMax || 99,
      salary: rawJob.salary || '',
      techStack: rawJob.techStack || [],
      description: rawJob.description || '',
      requirements: rawJob.requirements || '',
      benefits: rawJob.benefits || '',
      dueDate: rawJob.dueDate || null,
      postedDate: rawJob.postedDate || null,
      isRemote: rawJob.isRemote || false,
      employmentType: rawJob.employmentType || '',
      crawledAt: new Date().toISOString(),
    };
  }
}

export const SARAMIN_CATEGORIES = {
  IT_DEVELOPMENT: '2',
  SECURITY: '201',
  NETWORK: '202',
  DBA: '203',
  SYSTEM: '204',
  WEB_DEVELOPMENT: '205',
};

export default SaraminCrawler;
