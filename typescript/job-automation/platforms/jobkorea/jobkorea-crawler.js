/**
 * JobKorea Crawler - 잡코리아 채용공고 크롤러
 * Next.js SPA 전환으로 인해 rebrowser-puppeteer 사용 (stealth CDP patches)
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

export class JobKoreaCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('jobkorea', {
      baseUrl: 'https://www.jobkorea.co.kr',
      rateLimit: 2000,
      ...options,
    });
    this.browser = null;
  }

  buildSearchQuery(params) {
    const query = new URLSearchParams({
      stext: params.keyword || '',
      tabType: 'recruit',
      Page_No: params.page || 1,
      Page_Count: Math.min(params.limit || 20, 50),
      orderBy: params.sort || 'RegDtDesc',
    });

    if (params.experience !== undefined) {
      query.set('careerType', params.experience === 0 ? 'N' : 'E');
      if (params.experience > 0) {
        query.set('careerMin', params.experience);
        query.set('careerMax', params.experienceMax || params.experience + 5);
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

  getLocationCode(location) {
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
        error: error.message,
        jobs: [],
      };
    }
  }

  async searchWithBrowser(params) {
    let browser = null;
    try {
      const puppeteer = await import('puppeteer').then((m) => m.default);

      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const query = this.buildSearchQuery(params);
      const url = `${this.baseUrl}/Search/?${query}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      await page
        .waitForSelector('a[href*="/Recruit/GI_Read/"]', {
          timeout: 10000,
        })
        .catch(() => {});

      const jobs = await page.evaluate(() => {
        const results = [];
        const jobMap = new Map();
        const links = document.querySelectorAll('a[href*="/Recruit/GI_Read/"]');

        links.forEach((link) => {
          const href = link.getAttribute('href') || '';
          const idMatch = href.match(/\/Recruit\/GI_Read\/(\d+)/);
          if (!idMatch) return;

          const jobId = idMatch[1];
          const text = link.textContent?.trim() || '';
          const hasImg = link.querySelector('img') !== null;

          if (!jobMap.has(jobId)) {
            jobMap.set(jobId, {
              id: jobId,
              position: '',
              company: '',
              url: href,
            });
          }

          const job = jobMap.get(jobId);
          if (!hasImg && text.length > 0) {
            if (!job.position) {
              job.position = text;
            } else if (!job.company) {
              job.company = text;
            }
          }
        });

        jobMap.forEach((job) => {
          if (job.position && job.position.length >= 5) {
            results.push(job);
          }
        });

        return results.slice(0, 20);
      });

      return jobs.map((job) => this.normalizeJob(job));
    } finally {
      if (browser) await browser.close();
    }
  }

  async getJobDetail(jobId) {
    let browser = null;
    try {
      const puppeteer = await import('puppeteer').then((m) => m.default);

      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      const url = `${this.baseUrl}/Recruit/GI_Read/${jobId}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const job = await page.evaluate((jid) => {
        const title = document.querySelector('[class*="title"], h1')?.textContent?.trim() || '';
        const company = document.querySelector('[class*="company"]')?.textContent?.trim() || '';
        const description =
          document
            .querySelector('[class*="description"], [class*="content"]')
            ?.textContent?.trim() || '';

        return { id: jid, position: title, company, description };
      }, jobId);

      return {
        success: true,
        source: 'jobkorea',
        job: this.normalizeJob(job),
      };
    } catch (error) {
      return {
        success: false,
        source: 'jobkorea',
        error: error.message,
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  async getProfile() {
    if (!this.cookies) {
      return { success: false, error: 'Authentication required' };
    }

    return {
      success: true,
      profile: { name: null, careers: [], skills: [] },
    };
  }

  normalizeJob(rawJob) {
    return {
      id: `jobkorea_${rawJob.id}`,
      sourceId: rawJob.id,
      source: 'jobkorea',
      sourceUrl: rawJob.url || `${this.baseUrl}/Recruit/GI_Read/${rawJob.id}`,
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

export const JOBKOREA_CATEGORIES = {
  IT_DEVELOPMENT: '1000238',
  SECURITY: '1000239',
  NETWORK: '1000240',
  DBA: '1000241',
  SYSTEM: '1000242',
  DEVOPS: '1000243',
};

export default JobKoreaCrawler;
