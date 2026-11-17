import { normalizeJob, normalizeJobDetail, normalizeCompany, JOB_CATEGORIES } from '../types.js';

/**
 * @typedef {import('../http-client.js').HttpClient} HttpClient
 */

/**
 * @typedef {Object} JobSearchOptions
 * @property {string | number | (string | number)[]} [tag_type_ids]
 * @property {keyof typeof JOB_CATEGORIES | string} [category]
 * @property {string} [locations]
 * @property {number | string} [years]
 * @property {number | string} [limit]
 * @property {number | string} [offset]
 */

/**
 * @typedef {Object} KeywordSearchOptions
 * @property {number | string} [limit]
 * @property {number | string} [offset]
 * @property {number | string} [years]
 * @property {string} [locations]
 * @property {string} [sort]
 */

/**
 * @typedef {Object} CompanyJobsOptions
 * @property {number | string} [limit]
 * @property {number | string} [offset]
 */

export class JobsEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {JobSearchOptions} [options]
   */
  async search(options = {}) {
    const params = new URLSearchParams();
    params.append('country', 'kr'); // Default to KR

    // Handle category (support both single 'category' and array 'tag_type_ids')
    if (options.tag_type_ids) {
      const ids = Array.isArray(options.tag_type_ids)
        ? options.tag_type_ids
        : [options.tag_type_ids];
      ids.forEach((id) => params.append('tag_type_ids', String(id)));
    } else if (options.category) {
      const categoryId =
        JOB_CATEGORIES[/** @type {keyof typeof JOB_CATEGORIES} */ (options.category)] ||
        options.category;
      params.append('tag_type_ids', String(categoryId));
    }

    if (options.locations && options.locations !== 'all') {
      params.append('locations', String(options.locations));
    }

    if (options.years && options.years !== -1) {
      params.append('years', String(options.years));
    }

    params.append('limit', String(options.limit || 20));
    params.append('offset', String(options.offset || 0));
    params.append('job_sort', 'company.response_rate_order');

    const response = await this.#client.request(`/jobs?${params}`);
    return {
      jobs: (response.data || []).map(normalizeJob),
      total: response.total || response.data?.length || 0,
      links: response.links,
    };
  }

  /**
   * @param {string} keyword
   * @param {KeywordSearchOptions} [options]
   */
  async searchByKeyword(keyword, options = {}) {
    const params = new URLSearchParams();
    params.append('country', 'kr');
    params.append('query', keyword);
    // The position search returns an empty HTTP 200 response above its page limit.
    const limit = Math.min(Number(options.limit || 20), 20);
    params.append('limit', String(limit));
    if (options.locations) params.append('locations', options.locations);
    if (options.sort) params.append('sort', options.sort);

    if (options.years !== undefined && options.years !== -1) {
      params.append('years', String(options.years));
    }

    /** @type {Map<string, ReturnType<typeof normalizeJob>>} */
    const jobs = new Map();
    let total = 0;
    for (let page = 0; page < 10; page++) {
      params.set('offset', String(Number(options.offset || 0) + page * limit));
      const response = await this.#client.chaosRequest(`/search/v1/position?${params}`);
      const data = response.data || [];
      total = response.total_count ?? total;
      for (const rawJob of data) {
        const job = normalizeJob(rawJob);
        const id = String(job.id);
        if (!jobs.has(id)) jobs.set(id, job);
      }
      if (data.length < limit) break;
    }
    return { jobs: [...jobs.values()], total: total || jobs.size };
  }

  /**
   * @param {string | number} jobId
   */
  async getDetail(jobId) {
    const response = await this.#client.request(`/jobs/${jobId}`);
    return normalizeJobDetail(response.data || response);
  }

  async getTags() {
    const response = await this.#client.request('/tags');
    return response.data || response;
  }
}

export class CompaniesEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} companyId
   */
  async get(companyId) {
    const response = await this.#client.request(`/companies/${companyId}`);
    return normalizeCompany(response.data || response);
  }

  /**
   * @param {string | number} companyId
   * @param {CompanyJobsOptions} [options]
   */
  async getJobs(companyId, options = {}) {
    const params = new URLSearchParams();
    params.append('limit', String(options.limit || 20));
    params.append('offset', String(options.offset || 0));

    const response = await this.#client.request(`/companies/${companyId}/jobs?${params}`);
    return {
      jobs: (response.data || []).map(normalizeJob),
      total: response.total_count || response.data?.length || 0,
    };
  }
}

export class AuthEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const response = await this.#client.request('/login', {
      method: 'POST',
      body: { email, password },
    });
    return response;
  }
}
