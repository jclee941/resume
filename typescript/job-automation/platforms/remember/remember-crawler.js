/**
 * Remember Crawler - 리멤버 커리어 채용공고 크롤러
 *
 * API Endpoints (no auth required):
 * - career-api.rememberapp.co.kr/job_postings/search
 * - career-api.rememberapp.co.kr/job_postings/curations
 *
 * Fallback: rebrowser-puppeteer for DOM scraping (stealth CDP patches)
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { withStealthBrowser } from '../../src/crawlers/browser-utils.js';

export class RememberCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('remember', {
      baseUrl: 'https://career.rememberapp.co.kr',
      apiBaseUrl: 'https://career-api.rememberapp.co.kr',
      rateLimit: 1000,
      ...options,
    });
    this.apiBaseUrl = options.apiBaseUrl || 'https://career-api.rememberapp.co.kr';
  }

  buildSearchQuery(params) {
    const query = new URLSearchParams();
    if (params.keyword) query.set('search', params.keyword);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('per', Math.min(params.limit, 50));
    return query.toString();
  }

  async searchJobs(params = {}) {
    try {
      const apiResult = await this.searchWithAPI(params);
      if (apiResult.success && apiResult.jobs.length > 0) {
        return apiResult;
      }
      return await this.searchWithBrowser(params);
    } catch (error) {
      console.error('[Remember] Search error:', error.message);
      return {
        success: false,
        source: 'remember',
        error: error.message,
        jobs: [],
      };
    }
  }

  async searchWithAPI(params = {}) {
    try {
      const searchParams = {
        page: params.page || 1,
        per: Math.min(params.limit || 20, 50),
      };

      const body = new URLSearchParams();
      body.set('page', searchParams.page);
      body.set('per', searchParams.per);
      if (params.keyword) body.set('search', params.keyword);

      const url = params.keyword
        ? `${this.apiBaseUrl}/job_postings/search`
        : `${this.apiBaseUrl}/job_postings/curations?tab=STEP_UP&page=${searchParams.page}&per=${searchParams.per}`;

      const response = await fetch(url, {
        method: params.keyword ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': this.headers['User-Agent'],
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/job/postings`,
        },
        ...(params.keyword ? { body: body.toString() } : {}),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const jobsData = data.data?.job_postings || data.data || [];
      const jobs = Array.isArray(jobsData) ? jobsData : [];

      return {
        success: true,
        source: 'remember',
        total: jobs.length,
        hasMore: jobs.length >= searchParams.per,
        jobs: jobs.map((job) => this.normalizeJob(job)),
      };
    } catch (error) {
      console.warn('[Remember] API search failed:', error.message);
      return { success: false, jobs: [] };
    }
  }

  async searchWithBrowser(params = {}) {
    return withStealthBrowser(async (page) => {
      const query = params.keyword ? `?search=${encodeURIComponent(params.keyword)}` : '';
      const url = `${this.baseUrl}/job/postings${query}`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('a[href*="/job/posting/"]', { timeout: 10000 }).catch(() => {});

      const jobs = await page.evaluate((limit) => {
        const results = [];
        const links = document.querySelectorAll('a[href*="/job/posting/"]');
        const seen = new Set();

        links.forEach((link) => {
          if (results.length >= limit) return;

          const href = link.getAttribute('href') || '';
          const idMatch = href.match(/\/job\/posting\/(\d+)/);
          if (!idMatch) return;

          const jobId = idMatch[1];
          if (seen.has(jobId)) return;
          seen.add(jobId);

          // DOM text format: title\ncompany\nexperience\nlocation
          const text = (link.innerText || '').trim();
          const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

          if (lines.length >= 2) {
            results.push({
              id: jobId,
              title: lines[0] || '',
              company: lines[1] || '',
              experience: lines[2] || '',
              location: lines[3] || '',
              url: href,
            });
          }
        });

        return results;
      }, params.limit || 20);

      return {
        success: true,
        source: 'remember',
        total: jobs.length,
        hasMore: jobs.length >= (params.limit || 20),
        jobs: jobs.map((job) => this.normalizeJob(job)),
      };
    });
  }

  async getJobDetail(jobId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/job_postings/${jobId}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.headers['User-Agent'],
        },
      });

      if (response.ok) {
        const data = await response.json();
        const job = data.data || data;
        return {
          success: true,
          source: 'remember',
          job: this.normalizeJob(job, true),
        };
      }

      return await this.getJobDetailWithBrowser(jobId);
    } catch (error) {
      return {
        success: false,
        source: 'remember',
        error: error.message,
      };
    }
  }

  async getJobDetailWithBrowser(jobId) {
    const job = await withStealthBrowser(async (page) => {
      const url = `${this.baseUrl}/job/posting/${jobId}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      return page.evaluate((jid) => {
        const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
        const title = getText('h1') || getText('[class*="title"]');
        const company = getText('[class*="company"]') || getText('[class*="CompanyName"]');
        const description =
          getText('[class*="description"]') || getText('[class*="content"]') || getText('main');

        return {
          id: jid,
          title,
          company,
          description: description.substring(0, 5000),
        };
      }, jobId);
    });

    return {
      success: true,
      source: 'remember',
      job: this.normalizeJob(job, true),
    };
  }

  normalizeJob(rawJob, _isDetail = false) {
    // Parse Korean experience format: "5년~12년 차" or "5년 이상"
    let experienceMin = 0;
    let experienceMax = 99;

    const expStr = rawJob.experience || rawJob.career_period || '';
    const expMatch = expStr.match(/(\d+)(?:년)?(?:~|-)(\d+)?/);
    if (expMatch) {
      experienceMin = parseInt(expMatch[1]) || 0;
      experienceMax = parseInt(expMatch[2]) || experienceMin + 10;
    } else if (expStr.includes('이상')) {
      const minMatch = expStr.match(/(\d+)/);
      experienceMin = parseInt(minMatch?.[1]) || 0;
      experienceMax = 99;
    }

    return {
      id: `remember_${rawJob.id}`,
      sourceId: String(rawJob.id),
      source: 'remember',
      sourceUrl: rawJob.url || `${this.baseUrl}/job/posting/${rawJob.id}`,
      position: rawJob.title || rawJob.position || '',
      company:
        rawJob.organization?.name ||
        rawJob.company?.name ||
        rawJob.company_name ||
        rawJob.company ||
        '',
      companyId: rawJob.organization?.company_id || rawJob.company?.id || rawJob.company_id || '',
      location: rawJob.normalized_address
        ? `${rawJob.normalized_address.level1}/${rawJob.normalized_address.level2}`
        : rawJob.location || rawJob.region || '',
      experienceMin: rawJob.min_experience || experienceMin,
      experienceMax: rawJob.max_experience || experienceMax,
      salary:
        rawJob.salary || rawJob.min_salary
          ? `${rawJob.min_salary || ''}-${rawJob.max_salary || ''}`
          : '',
      techStack: rawJob.skills || rawJob.tech_stack || [],
      description: rawJob.job_description || rawJob.description || '',
      requirements: rawJob.qualifications || rawJob.requirements || '',
      benefits: rawJob.benefits || rawJob.welfare || '',
      dueDate: rawJob.deadline || rawJob.due_date || null,
      postedDate: rawJob.created_at || rawJob.posted_date || null,
      isRemote: rawJob.is_remote || false,
      employmentType: rawJob.employment_type || rawJob.job_posting_type || '',
      applicationType: rawJob.application_type || '',
      crawledAt: new Date().toISOString(),
    };
  }

  async getProfile() {
    if (!this.cookies) {
      return {
        success: false,
        error: 'Authentication required. Login to career.rememberapp.co.kr and provide cookies.',
      };
    }
    return { success: true, profile: { name: null, careers: [], skills: [] } };
  }
}

export const REMEMBER_CATEGORIES = {
  STEP_UP: 'STEP_UP', // 커리어 도약
  SILVER_SALARY: 'SILVER_TIER_SALARY', // 5천 이상 연봉
  GOLD_SALARY: 'GOLD_TIER_SALARY', // 억대 연봉
  LEADER: 'LEADER_POSITION', // 리더급 포지션
};

export default RememberCrawler;
