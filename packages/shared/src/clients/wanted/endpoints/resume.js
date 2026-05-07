export class ResumeEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async list() {
    // Chaos API requires /v1 version suffix
    const response = await this.#client.chaosRequest('/resumes/v1');
    return response.data || response;
  }

  async getDetail(resumeId) {
    // Use v2 endpoint — v1 returns empty activities with OneID token auth
    const response = await this.#client.chaosRequest(`/resumes/v2/${resumeId}`);
    return response.data || response;
  }

  async save(resumeId, data) {
    // Chaos API requires /v1 version suffix
    const response = await this.#client.chaosRequest(`/resumes/v1/${resumeId}`, {
      method: 'PUT',
      body: data,
    });
    return response;
  }

  async updateStatus(resumeId, isPublic) {
    const response = await this.#client.chaosRequest(
      `/resumes/v1/${resumeId}/status`,
      { method: 'PUT', body: { is_public: isPublic } },
    );
    return response;
  }

  async regeneratePdf(resumeId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v1/${resumeId}/pdf`,
      { method: 'POST' },
    );
    return response;
  }
}

export class ResumeCareerEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async update(resumeId, careerId, careerData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}`,
      { method: 'PATCH', body: careerData },
    );
    return response;
  }

  async add(resumeId, careerData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers`,
      { method: 'POST', body: careerData },
    );
    return response;
  }

  async delete(resumeId, careerId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}`,
      { method: 'DELETE' },
    );
    return response;
  }

  async addProject(resumeId, careerId, projectData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}/projects`,
      { method: 'POST', body: projectData },
    );
    return response;
  }

  async deleteProject(resumeId, careerId, projectId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/careers/${careerId}/projects/${projectId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class ResumeEducationEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async update(resumeId, educationId, educationData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'PATCH', body: educationData },
    );
    return response;
  }

  async add(resumeId, educationData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/educations`,
      { method: 'POST', body: educationData },
    );
    return response;
  }

  async delete(resumeId, educationId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/educations/${educationId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class ResumeSkillsEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async add(resumeId, skillData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v1/${resumeId}/skills`,
      { method: 'POST', body: skillData },
    );
    return response;
  }

  async delete(resumeId, skillId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v1/${resumeId}/skills/${skillId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class ResumeActivityEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async update(resumeId, activityId, activityData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'PATCH', body: activityData },
    );
    return response;
  }

  async add(resumeId, activityData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/activities`,
      { method: 'POST', body: activityData },
    );
    return response;
  }

  async delete(resumeId, activityId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/activities/${activityId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}

export class ResumeLanguageCertEndpoint {
  #client;

  constructor(httpClient) {
    this.#client = httpClient;
  }

  async update(resumeId, certId, certData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/language_certs/${certId}`,
      { method: 'PATCH', body: certData },
    );
    return response;
  }

  async add(resumeId, certData) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/language_certs`,
      { method: 'POST', body: certData },
    );
    return response;
  }

  async delete(resumeId, certId) {
    const response = await this.#client.chaosRequest(
      `/resumes/v2/${resumeId}/language_certs/${certId}`,
      { method: 'DELETE' },
    );
    return response;
  }
}
