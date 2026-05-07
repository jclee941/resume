export class ProfileEndpoint {
  #client;

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

  async update(profileData) {
    const response = await this.#client.snsProfileRequest('/profile', {
      method: 'PATCH',
      body: profileData,
    });
    return response;
  }

  async getApplications(options = {}) {
    const params = new URLSearchParams();
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);
    if (options.status) params.append('status', options.status);

    const response = await this.#client.request(`/applications?${params}`);
    return response.data || response;
  }

  async getBookmarks(options = {}) {
    const params = new URLSearchParams();
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);

    const response = await this.#client.request(`/bookmarks?${params}`);
    return response.data || response;
  }

  async getResumes() {
    const response = await this.#client.request('/resumes');
    return response.data || response;
  }
}

export class ExperienceEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async add(experienceData) {
    const response = await this.#client.snsRequest('/user/experiences', {
      method: 'POST',
      body: experienceData,
    });
    return response;
  }

  async update(experienceId, experienceData) {
    const response = await this.#client.snsRequest(
      `/user/experiences/${experienceId}`,
      { method: 'PUT', body: experienceData },
    );
    return response;
  }

  async delete(experienceId) {
    const response = await this.#client.snsRequest(
      `/user/experiences/${experienceId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class EducationEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async add(educationData) {
    const response = await this.#client.snsRequest('/user/educations', {
      method: 'POST',
      body: educationData,
    });
    return response;
  }

  async update(educationId, educationData) {
    const response = await this.#client.snsRequest(
      `/user/educations/${educationId}`,
      { method: 'PUT', body: educationData },
    );
    return response;
  }

  async delete(educationId) {
    const response = await this.#client.snsRequest(
      `/user/educations/${educationId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class SkillsEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async add(skillData) {
    const response = await this.#client.snsRequest('/user/skills', {
      method: 'POST',
      body: skillData,
    });
    return response;
  }

  async remove(skillId) {
    const response = await this.#client.snsRequest(`/user/skills/${skillId}`, {
      method: 'DELETE',
    });
    return response;
  }
}
