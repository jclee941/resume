import { DEFAULT_USER_AGENT } from '../utils/user-agents.js';

export class RememberClient {
  constructor(env) {
    this.env = env;
    this.baseUrl = 'https://career.rememberapp.co.kr';
    this.apiBaseUrl = 'https://career-api.rememberapp.co.kr';
  }

  async searchJobs(keyword, options = {}) {
    const params = {
      page: options.page || 1,
      per: Math.min(options.limit || 20, 50),
    };

    try {
      let url;
      let fetchOptions;

      if (keyword) {
        url = `${this.apiBaseUrl}/job_postings/search`;
        const body = new URLSearchParams();
        body.set('search', keyword);
        body.set('page', params.page);
        body.set('per', params.per);

        fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent':
              DEFAULT_USER_AGENT,
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/job/postings`,
          },
          body: body.toString(),
        };
      } else {
        url = `${this.apiBaseUrl}/job_postings/curations?tab=${options.tab || 'STEP_UP'}&page=${params.page}&per=${params.per}`;
        fetchOptions = {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent':
              DEFAULT_USER_AGENT,
          },
        };
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`Remember API returned ${response.status}`);
      }

      const data = await response.json();
      const jobsData = data.data?.job_postings || data.data || [];
      const jobs = Array.isArray(jobsData) ? jobsData : [];

      return {
        success: true,
        source: 'remember',
        total: jobs.length,
        hasMore: jobs.length >= params.per,
        jobs: jobs.map((job) => this.normalizeJob(job)),
      };
    } catch (error) {
      return {
        success: false,
        source: 'remember',
        error: error.message,
        jobs: [],
      };
    }
  }

  async searchCurated(tab = 'STEP_UP', options = {}) {
    return this.searchJobs(null, { ...options, tab });
  }

  async getJobDetail(jobId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/job_postings/${jobId}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            DEFAULT_USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Remember API returned ${response.status}`);
      }

      const data = await response.json();
      const job = data.data || data;

      return {
        success: true,
        source: 'remember',
        job: this.normalizeJob(job, true),
      };
    } catch (error) {
      return {
        success: false,
        source: 'remember',
        error: error.message,
      };
    }
  }

  parseExperience(expStr) {
    let experienceMin = 0;
    let experienceMax = 99;

    const expMatch = expStr.match(/(\d+)(?:년)?(?:~|-)(\d+)?/);
    if (expMatch) {
      experienceMin = parseInt(expMatch[1]) || 0;
      experienceMax = parseInt(expMatch[2]) || experienceMin + 10;
    } else if (expStr.includes('이상')) {
      const minMatch = expStr.match(/(\d+)/);
      experienceMin = parseInt(minMatch?.[1]) || 0;
      experienceMax = 99;
    }

    return { experienceMin, experienceMax };
  }

  normalizeJob(rawJob, _isDetail = false) {
    const expStr = rawJob.experience || rawJob.career_period || '';
    const { experienceMin, experienceMax } = this.parseExperience(expStr);

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
}

export const REMEMBER_CATEGORIES = {
  STEP_UP: 'STEP_UP',
  SILVER_SALARY: 'SILVER_TIER_SALARY',
  GOLD_SALARY: 'GOLD_TIER_SALARY',
  LEADER: 'LEADER_POSITION',
};

export default RememberClient;
