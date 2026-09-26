/**
 * @typedef {import('../http-client.js').HttpClient} HttpClient
 */

export class ResumeEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  async list() {
    // Chaos API requires /v1 version suffix
    const response = await this.#client.chaosRequest('/resumes/v1');
    return response.data || response;
  }

  /**
   * @param {string | number} resumeId
   */
  async getDetail(resumeId) {
    // Use v2 endpoint — v1 returns empty activities with OneID token auth
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}`);
    return response.data || response;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} data
   */
  async save(resumeId, data) {
    // Chaos API requires /v1 version suffix
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}`, {
      method: 'PUT',
      body: data,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {boolean} isPublic
   */
  async updateStatus(resumeId, isPublic) {
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}/status`, {
      method: 'PUT',
      body: { is_public: isPublic },
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   */
  async regeneratePdf(resumeId) {
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}/pdf`, {
      method: 'POST',
    });
    return response;
  }
}

export class ResumeCareerEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {Record<string, unknown>} careerData
   */
  async update(resumeId, careerId, careerData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}`,
      { method: 'PATCH', body: careerData }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} careerData
   */
  async add(resumeId, careerData) {
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}/careers`, {
      method: 'POST',
      body: careerData,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   */
  async delete(resumeId, careerId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}`,
      { method: 'DELETE' }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {Record<string, unknown>} projectData
   */
  async addProject(resumeId, careerId, projectData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}/projects`,
      { method: 'POST', body: projectData }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {string | number} projectId
   */
  async deleteProject(resumeId, careerId, projectId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}/projects/${projectId}`,
      { method: 'DELETE' }
    );
    return response;
  }
}

export class ResumeEducationEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} educationId
   * @param {Record<string, unknown>} educationData
   */
  async update(resumeId, educationId, educationData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'PATCH', body: educationData }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} educationData
   */
  async add(resumeId, educationData) {
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}/educations`, {
      method: 'POST',
      body: educationData,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} educationId
   */
  async delete(resumeId, educationId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'DELETE' }
    );
    return response;
  }
}

export class ResumeSkillsEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} skillData
   */
  async add(resumeId, skillData) {
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}/skills`, {
      method: 'POST',
      body: skillData,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} skillId
   */
  async delete(resumeId, skillId) {
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
    return response;
  }
}

export class ResumeActivityEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} activityId
   * @param {Record<string, unknown>} activityData
   */
  async update(resumeId, activityId, activityData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'PATCH', body: activityData }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} activityData
   */
  async add(resumeId, activityData) {
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}/activities`, {
      method: 'POST',
      body: activityData,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} activityId
   */
  async delete(resumeId, activityId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'DELETE' }
    );
    return response;
  }
}

export class ResumeLanguageCertEndpoint {
  /** @type {HttpClient} */
  #client;

  /**
   * @param {HttpClient} httpClient
   */
  constructor(httpClient) {
    this.#client = httpClient;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} certId
   * @param {Record<string, unknown>} certData
   */
  async update(resumeId, certId, certData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/language_certs/${certId}`,
      { method: 'PATCH', body: certData }
    );
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} certData
   */
  async add(resumeId, certData) {
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}/language_certs`, {
      method: 'POST',
      body: certData,
    });
    return response;
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} certId
   */
  async delete(resumeId, certId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/language_certs/${certId}`,
      { method: 'DELETE' }
    );
    return response;
  }
}
