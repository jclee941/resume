import {
  normalizeJob,
  normalizeJobDetail,
  normalizeCompany,
  JOB_CATEGORIES,
} from '../types.js';

export class JobsEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async search(options = {}) {
    const params = new URLSearchParams();
    params.append('country', 'kr'); // Default to KR

    // Handle category (support both single 'category' and array 'tag_type_ids')
    if (options.tag_type_ids) {
      const ids = Array.isArray(options.tag_type_ids)
        ? options.tag_type_ids
        : [options.tag_type_ids];
      ids.forEach((id) => params.append('tag_type_ids', id));
    } else if (options.category) {
      const categoryId = JOB_CATEGORIES[options.category] || options.category;
      params.append('tag_type_ids', categoryId);
    }

    if (options.locations && options.locations !== 'all') {
      params.append('locations', options.locations);
    }

    if (options.years && options.years !== -1) {
      params.append('years', options.years);
    }

    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);
    params.append('job_sort', 'company.response_rate_order');

    const response = await this.#client.request(`/jobs?${params}`);
    return {
      jobs: (response.data || []).map(normalizeJob),
      total: response.total || response.data?.length || 0,
      links: response.links,
    };
  }

  async searchByKeyword(keyword, options = {}) {
    const params = new URLSearchParams();
    params.append('query', keyword);
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);

    if (options.years !== undefined && options.years !== -1) {
      params.append('years', options.years);
    }

    const response = await this.#client.request(`/search/job?${params}`);
    return {
      jobs: (response.data || []).map(normalizeJob),
      total: response.total_count || response.data?.length || 0,
    };
  }

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
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async get(companyId) {
    const response = await this.#client.request(`/companies/${companyId}`);
    return normalizeCompany(response.data || response);
  }

  async getJobs(companyId, options = {}) {
    const params = new URLSearchParams();
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);

    const response = await this.#client.request(
      `/companies/${companyId}/jobs?${params}`,
    );
    return {
      jobs: (response.data || []).map(normalizeJob),
      total: response.total_count || response.data?.length || 0,
    };
  }
}

export class AuthEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async login(email, password) {
    const response = await this.#client.request('/login', {
      method: 'POST',
      body: { email, password },
    });
    return response;
  }
}
