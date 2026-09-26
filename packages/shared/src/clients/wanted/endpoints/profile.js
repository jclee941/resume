/**
 * @typedef {import('../http-client.js').HttpClient} HttpClient
 */

/**
 * @typedef {Object} ApplicationListOptions
 * @property {number | string} [limit]
 * @property {number | string} [offset]
 * @property {string} [status]
 */

/**
 * @typedef {Object} BookmarkListOptions
 * @property {number | string} [limit]
 * @property {number | string} [offset]
 */

export class ProfileEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  async get() {
    // Use v4 API - returns { name, oneid, mobile, country, jwt }
    const response = await this.#client.request('/user');
    return response;
  }

  async getSnsProfile() {
    // Use SNS API - returns full profile with user.description, skills, careers, etc.
    const response = await this.#client.snsProfileRequest('/profile');
    return response;
  }

  /**
   * @param {Record<string, unknown>} profileData
   */
  async update(profileData) {
    const response = await this.#client.snsProfileRequest('/profile', {
      method: 'PATCH',
      body: profileData,
    });
    return response;
  }

  /**
   * @param {ApplicationListOptions} [options]
   */
  async getApplications(options = {}) {
    const params = new URLSearchParams();
    params.append('limit', String(options.limit || 20));
    params.append('offset', String(options.offset || 0));
    if (options.status) params.append('status', String(options.status));

    const response = await this.#client.request(`/applications?${params}`);
    return response.data || response;
  }

  /**
   * @param {BookmarkListOptions} [options]
   */
  async getBookmarks(options = {}) {
    const params = new URLSearchParams();
    params.append('limit', String(options.limit || 20));
    params.append('offset', String(options.offset || 0));

    const response = await this.#client.request(`/bookmarks?${params}`);
    return response.data || response;
  }

  async getResumes() {
    const response = await this.#client.request('/resumes');
    return response.data || response;
  }
}

export class ExperienceEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {Record<string, unknown>} experienceData
   */
  async add(experienceData) {
    const response = await this.#client.snsRequest('/user/experiences', {
      method: 'POST',
      body: experienceData,
    });
    return response;
  }

  /**
   * @param {string | number} experienceId
   * @param {Record<string, unknown>} experienceData
   */
  async update(experienceId, experienceData) {
    const response = await this.#client.snsRequest(`/user/experiences/${experienceId}`, {
      method: 'PUT',
      body: experienceData,
    });
    return response;
  }

  /**
   * @param {string | number} experienceId
   */
  async delete(experienceId) {
    const response = await this.#client.snsRequest(`/user/experiences/${experienceId}`, {
      method: 'DELETE',
    });
    return response;
  }
}

export class EducationEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {Record<string, unknown>} educationData
   */
  async add(educationData) {
    const response = await this.#client.snsRequest('/user/educations', {
      method: 'POST',
      body: educationData,
    });
    return response;
  }

  /**
   * @param {string | number} educationId
   * @param {Record<string, unknown>} educationData
   */
  async update(educationId, educationData) {
    const response = await this.#client.snsRequest(`/user/educations/${educationId}`, {
      method: 'PUT',
      body: educationData,
    });
    return response;
  }

  /**
   * @param {string | number} educationId
   */
  async delete(educationId) {
    const response = await this.#client.snsRequest(`/user/educations/${educationId}`, {
      method: 'DELETE',
    });
    return response;
  }
}

export class SkillsEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {Record<string, unknown>} skillData
   */
  async add(skillData) {
    const response = await this.#client.snsRequest('/user/skills', {
      method: 'POST',
      body: skillData,
    });
    return response;
  }

  /**
   * @param {string | number} skillId
   */
  async remove(skillId) {
    const response = await this.#client.snsRequest(`/user/skills/${skillId}`, {
      method: 'DELETE',
    });
    return response;
  }
}
