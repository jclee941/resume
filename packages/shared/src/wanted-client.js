// WantedClient — core class + job search/apply/profile.
// Domain methods composed from wanted-resume-api, wanted-skill-api, wanted-profile-api.
import { DEFAULT_USER_AGENT } from './ua.js';
import { resumeApiMethods } from './wanted-resume-api.js';
import { skillApiMethods } from './wanted-skill-api.js';
import { profileApiMethods } from './wanted-profile-api.js';

const BASE_URL = 'https://www.wanted.co.kr/api/v4';
const CHAOS_BASE_URL = 'https://www.wanted.co.kr/api/chaos';
const SNS_BASE_URL = 'https://www.wanted.co.kr/api/sns-api';

export class WantedAPIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'WantedAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class WantedClient {
  constructor(cookies = '') {
    this.cookies = cookies;
  }

  setCookies(cookies) {
    this.cookies = cookies;
  }

  async request(endpoint, options = {}) {
    return this._fetch(`${BASE_URL}${endpoint}`, options);
  }

  async chaosRequest(endpoint, options = {}) {
    return this._fetch(`${CHAOS_BASE_URL}${endpoint}`, options);
  }

  async snsRequest(endpoint, options = {}) {
    return this._fetch(`${SNS_BASE_URL}${endpoint}`, options);
  }

  async _fetch(url, options = {}) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: 'https://www.wanted.co.kr/',
      Origin: 'https://www.wanted.co.kr',
      ...options.headers,
    };
    if (this.cookies) {
      headers.Cookie = this.cookies;
    }
    const fetchOptions = {
      method: options.method || 'GET',
      headers,
    };
    if (options.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new WantedAPIError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        await response.text().catch(() => null)
      );
    }
    return response.json();
  }

  async searchJobs(keyword, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const params = new URLSearchParams({
      tag_type_ids: '674',
      limit: String(limit),
      offset: String(offset),
      country: 'kr',
    });
    const data = await this.request(`/jobs?${params}`);
    return this.normalizeJobs(data?.data || []);
  }

  async searchByCategory(options = {}) {
    const { tagTypeIds = [674], limit = 20, offset = 0 } = options;
    const params = new URLSearchParams({
      tag_type_ids: tagTypeIds.join(','),
      limit: String(limit),
      offset: String(offset),
      country: 'kr',
    });
    const data = await this.request(`/jobs?${params}`);
    return this.normalizeJobs(data?.data || []);
  }

  async getJobDetail(jobId) {
    const data = await this.request(`/jobs/${jobId}`);
    return this.normalizeJobDetail(data?.job || data);
  }

  async apply(jobId, resumeId = null) {
    if (!this.cookies) {
      throw new WantedAPIError('Authentication required', 401, null);
    }
    const body = resumeId ? { resume_id: resumeId } : {};
    const response = await fetch('https://www.wanted.co.kr/api/chaos/applications/v1', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: this.cookies,
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: `https://www.wanted.co.kr/wd/${jobId}`,
        Origin: 'https://www.wanted.co.kr',
      },
      body: JSON.stringify({
        job_id: parseInt(jobId),
        ...body,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new WantedAPIError(`Application failed: ${response.status}`, response.status, text);
    }
    return response.json();
  }

  async getProfile() {
    if (!this.cookies) {
      throw new WantedAPIError('Authentication required', 401, null);
    }
    const response = await fetch('https://www.wanted.co.kr/api/v4/users/status', {
      headers: {
        Accept: 'application/json',
        Cookie: this.cookies,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new WantedAPIError(`Profile fetch failed: ${response.status}`, response.status, null);
    }
    return response.json();
  }

  _requireAuth() {
    if (!this.cookies) {
      throw new WantedAPIError('Authentication required', 401, null);
    }
  }

  normalizeJobs(jobs) {
    return jobs.map((job) => ({
      id: job.id,
      title: job.position || job.title || 'Unknown',
      company: job.company?.name || job.company_name || 'Unknown',
      location: job.address?.full_location || job.address?.location || job.location || null,
      skills: job.skill_tags || [],
      experienceLevel:
        job.career?.min !== undefined ? `${job.career.min}-${job.career.max || ''}년` : null,
      salary: job.reward?.formatted_total || null,
      url: `https://www.wanted.co.kr/wd/${job.id}`,
    }));
  }

  normalizeJobDetail(job) {
    return {
      id: job.id,
      title: job.position || job.title || 'Unknown',
      company: {
        name: job.company?.name || 'Unknown',
        id: job.company?.id || null,
        industry: job.company?.industry_name || null,
      },
      description: job.detail?.intro || job.description || '',
      requirements: job.detail?.main_tasks || '',
      qualifications: job.detail?.requirements || '',
      preferred: job.detail?.preferred || '',
      benefits: job.detail?.benefits || '',
      location: job.address?.full_location || job.address?.location || job.location || null,
      skills: job.skill_tags || [],
      url: `https://www.wanted.co.kr/wd/${job.id}`,
    };
  }
}

Object.assign(WantedClient.prototype, resumeApiMethods);
Object.assign(WantedClient.prototype, skillApiMethods);
Object.assign(WantedClient.prototype, profileApiMethods);

export default WantedClient;
