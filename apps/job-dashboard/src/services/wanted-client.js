/**
 * WantedClient for Cloudflare Workers
 * Pure fetch-based, no external dependencies
 */

import { DEFAULT_USER_AGENT } from '../utils/user-agents.js';

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
    const url = `${BASE_URL}${endpoint}`;
    return this._fetch(url, options);
  }

  /**
   * Chaos API request (resume management)
   * @param {string} endpoint - API endpoint (e.g., "/resumes/v1")
   * @param {object} options - fetch options
   */
  async chaosRequest(endpoint, options = {}) {
    const url = `${CHAOS_BASE_URL}${endpoint}`;
    return this._fetch(url, options);
  }

  /**
   * SNS API request (profile management)
   * @param {string} endpoint - API endpoint (e.g., "/profile")
   * @param {object} options - fetch options
   */
  async snsRequest(endpoint, options = {}) {
    const url = `${SNS_BASE_URL}${endpoint}`;
    return this._fetch(url, options);
  }

  /**
   * Internal fetch helper with common headers
   */
  async _fetch(url, options = {}) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent':
        DEFAULT_USER_AGENT,
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
        await response.text().catch(() => null),
      );
    }

    return response.json();
  }

  /**
   * Search jobs by keyword
   * @param {string} keyword - Search keyword
   * @param {object} options - { limit, offset }
   */
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

  /**
   * Search jobs by category (tag_type_id)
   * @param {object} options - { tagTypeIds, limit, offset }
   */
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

  /**
   * Get job detail
   * @param {string|number} jobId - Job ID
   */
  async getJobDetail(jobId) {
    const data = await this.request(`/jobs/${jobId}`);
    return this.normalizeJobDetail(data?.job || data);
  }

  /**
   * Apply to a job (requires authentication)
   * @param {string|number} jobId - Job ID
   * @param {string} resumeId - Resume ID (optional, uses default)
   */
  async apply(jobId, resumeId = null) {
    if (!this.cookies) {
      throw new WantedAPIError('Authentication required', 401, null);
    }

    const body = resumeId ? { resume_id: resumeId } : {};

    const response = await fetch(
      'https://www.wanted.co.kr/api/chaos/applications/v1',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Cookie: this.cookies,
          'User-Agent':
            DEFAULT_USER_AGENT,
          Referer: `https://www.wanted.co.kr/wd/${jobId}`,
          Origin: 'https://www.wanted.co.kr',
        },
        body: JSON.stringify({
          job_id: parseInt(jobId),
          ...body,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new WantedAPIError(
        `Application failed: ${response.status}`,
        response.status,
        text,
      );
    }

    return response.json();
  }

  /**
   * Get current user profile (requires authentication)
   */
  async getProfile() {
    if (!this.cookies) {
      throw new WantedAPIError('Authentication required', 401, null);
    }

    const response = await fetch(
      'https://www.wanted.co.kr/api/v4/users/status',
      {
        headers: {
          Accept: 'application/json',
          Cookie: this.cookies,
          'User-Agent':
            DEFAULT_USER_AGENT,
        },
      },
    );

    if (!response.ok) {
      throw new WantedAPIError(
        `Profile fetch failed: ${response.status}`,
        response.status,
        null,
      );
    }

    return response.json();
  }

  // ============================================================
  // CHAOS API: Resume Management
  // ============================================================

  async getResumeList() {
    this._requireAuth();
    const response = await this.chaosRequest('/resumes/v1');
    return response.data || response;
  }

  async getResumeDetail(resumeId) {
    this._requireAuth();
    const response = await this.chaosRequest(`/resumes/v1/${resumeId}`);
    return response.data || response;
  }

  async saveResume(resumeId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/${resumeId}/pdf`, { method: 'POST' });
  }

  // ============================================================
  // CHAOS API v2: Career CRUD
  // ============================================================

  async updateCareer(resumeId, careerId, careerData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}`, {
      method: 'PATCH',
      body: careerData,
    });
  }

  async addCareer(resumeId, careerData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers`, {
      method: 'POST',
      body: careerData,
    });
  }

  async deleteCareer(resumeId, careerId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================
  // CHAOS API v2: Education CRUD
  // ============================================================

  async updateEducation(resumeId, educationId, educationData) {
    this._requireAuth();
    return this.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'PATCH', body: educationData },
    );
  }

  async addEducation(resumeId, educationData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations`, {
      method: 'POST',
      body: educationData,
    });
  }

  async deleteEducation(resumeId, educationId) {
    this._requireAuth();
    return this.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'DELETE' },
    );
  }

  // ============================================================
  // CHAOS API v1: Skills CRUD (v1 only! v2 returns 404)
  // ============================================================

  async addSkill(resumeId, tagTypeId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}/skills`, {
      method: 'POST',
      body: { tag_type_id: tagTypeId },
    });
  }

  async deleteSkill(resumeId, skillId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================
  // CHAOS API v2: Activity CRUD
  // ============================================================

  async updateActivity(resumeId, activityId, activityData) {
    this._requireAuth();
    return this.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'PATCH', body: activityData },
    );
  }

  async addActivity(resumeId, activityData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities`, {
      method: 'POST',
      body: activityData,
    });
  }

  async deleteActivity(resumeId, activityId) {
    this._requireAuth();
    return this.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'DELETE' },
    );
  }

  // ============================================================
  // SNS API: Profile Update
  // ============================================================

  async updateProfile(profileData) {
    this._requireAuth();
    return this.snsRequest('/profile', {
      method: 'PATCH',
      body: profileData,
    });
  }

  /**
   * Update resume top-level fields (about, email, mobile)
   * @param {string} resumeId - Resume ID
   * @param {object} fields - Fields to update (about, email, mobile)
   */
  async updateResumeFields(resumeId, fields) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}`, {
      method: 'PUT',
      body: fields,
    });
  }

  // ============================================================
  // Helper Methods
  // ============================================================

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
      location:
        job.address?.full_location ||
        job.address?.location ||
        job.location ||
        null,
      skills: job.skill_tags || [],
      experienceLevel:
        job.career?.min !== undefined
          ? `${job.career.min}-${job.career.max || ''}년`
          : null,
      salary: job.reward?.formatted_total || null,
      url: `https://www.wanted.co.kr/wd/${job.id}`,
    }));
  }

  /**
   * Normalize job detail from API response
   */
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
      location:
        job.address?.full_location ||
        job.address?.location ||
        job.location ||
        null,
      skills: job.skill_tags || [],
      url: `https://www.wanted.co.kr/wd/${job.id}`,
    };
  }
}

export default WantedClient;
