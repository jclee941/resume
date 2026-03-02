import { DEFAULT_USER_AGENT } from '../utils/user-agents.js';

export class LinkedInClient {
  constructor(env) {
    this.env = env;
    this.baseUrl = 'https://www.linkedin.com';
  }

  buildSearchQuery(params) {
    const query = new URLSearchParams({
      keywords: params.keyword || '',
      location: params.location || 'South Korea',
      f_TPR: params.timeRange || 'r604800',
      start: params.offset || 0,
    });

    if (params.experienceLevel) {
      query.set('f_E', this.getExperienceLevel(params.experienceLevel));
    }

    if (params.workType) {
      query.set('f_WT', params.workType);
    }

    return query.toString();
  }

  getExperienceLevel(years) {
    if (years <= 2) return '1,2';
    if (years <= 5) return '3';
    if (years <= 10) return '4';
    return '5,6';
  }

  async searchJobs(keyword, options = {}) {
    const params = { keyword, ...options };
    const query = this.buildSearchQuery(params);
    const url = `${this.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?${query}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            DEFAULT_USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API returned ${response.status}`);
      }

      const html = await response.text();
      const jobs = this.parseSearchResults(html);

      return {
        success: true,
        source: 'linkedin',
        total: jobs.length,
        hasMore: jobs.length >= 25,
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        source: 'linkedin',
        error: error.message,
        jobs: [],
      };
    }
  }

  parseSearchResults(html) {
    const jobs = [];

    const jobPattern =
      /<div[^>]*class="[^"]*base-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;

    let match;
    while ((match = jobPattern.exec(html)) !== null) {
      jobs.push(
        this.normalizeJob({
          id: match[1],
          position: match[2].trim(),
          company: match[3].trim(),
        }),
      );
    }

    const altPattern =
      /<li[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/jobs\/view\/(\d+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*job-search-card__company-name[^"]*"[^>]*>([^<]+)<\/span>/gi;

    while ((match = altPattern.exec(html)) !== null) {
      const exists = jobs.some((j) => j.sourceId === match[1]);
      if (!exists) {
        jobs.push(
          this.normalizeJob({
            id: match[1],
            position: match[2].trim(),
            company: match[3].trim(),
          }),
        );
      }
    }

    return jobs;
  }

  async getJobDetail(jobId) {
    const url = `${this.baseUrl}/jobs-guest/jobs/api/jobPosting/${jobId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            DEFAULT_USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API returned ${response.status}`);
      }

      const html = await response.text();
      const job = this.parseJobDetail(html, jobId);

      return {
        success: true,
        source: 'linkedin',
        job,
      };
    } catch (error) {
      return {
        success: false,
        source: 'linkedin',
        error: error.message,
      };
    }
  }

  parseJobDetail(html, jobId) {
    const titleMatch = html.match(
      /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    );
    const companyMatch = html.match(
      /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([^<]+)<\/a>/i,
    );
    const locationMatch = html.match(
      /<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([^<]+)<\/span>/i,
    );
    const descMatch = html.match(
      /<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );

    return {
      id: `linkedin_${jobId}`,
      sourceId: jobId,
      source: 'linkedin',
      sourceUrl: `${this.baseUrl}/jobs/view/${jobId}`,
      position: titleMatch ? titleMatch[1].trim() : '',
      company: companyMatch ? companyMatch[1].trim() : '',
      location: locationMatch ? locationMatch[1].trim() : '',
      description: descMatch ? this.stripHtml(descMatch[1]) : '',
      crawledAt: new Date().toISOString(),
    };
  }

  stripHtml(html) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeJob(rawJob) {
    return {
      id: `linkedin_${rawJob.id}`,
      sourceId: rawJob.id,
      source: 'linkedin',
      sourceUrl: `${this.baseUrl}/jobs/view/${rawJob.id}`,
      position: rawJob.position || '',
      company: rawJob.company || '',
      companyId: rawJob.companyId || '',
      location: rawJob.location || 'South Korea',
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

export const LINKEDIN_FILTERS = {
  TIME_RANGE: {
    PAST_24H: 'r86400',
    PAST_WEEK: 'r604800',
    PAST_MONTH: 'r2592000',
  },
  WORK_TYPE: {
    ON_SITE: '1',
    REMOTE: '2',
    HYBRID: '3',
  },
  EXPERIENCE: {
    INTERNSHIP: '1',
    ENTRY: '2',
    ASSOCIATE: '3',
    MID_SENIOR: '4',
    DIRECTOR: '5',
    EXECUTIVE: '6',
  },
};

export default LinkedInClient;
