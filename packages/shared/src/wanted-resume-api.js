/**
 * Resume CRUD domain methods for WantedClient.
 * Mixed into WantedClient.prototype via Object.assign.
 *
 * All methods assume `this` is a WantedClient instance
 * with `_requireAuth()` and `chaosRequest()` available.
 */

export const resumeApiMethods = {
  async getResumeList() {
    this._requireAuth();
    const response = await this.chaosRequest('/resumes/v1');
    return response.data || response;
  },

  async getResumeDetail(resumeId) {
    this._requireAuth();
    const response = await this.chaosRequest(`/resumes/v1/${resumeId}`);
    return response.data || response;
  },

  async saveResume(resumeId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/${resumeId}/pdf`, { method: 'POST' });
  },

  // Career CRUD

  async updateCareer(resumeId, careerId, careerData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}`, {
      method: 'PATCH',
      body: careerData,
    });
  },

  async addCareer(resumeId, careerData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers`, {
      method: 'POST',
      body: careerData,
    });
  },

  async deleteCareer(resumeId, careerId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}`, {
      method: 'DELETE',
    });
  },

  // Career Project CRUD

  async addProject(resumeId, careerId, projectData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}/projects`, {
      method: 'POST',
      body: projectData,
    });
  },

  async deleteProject(resumeId, careerId, projectId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  // Education CRUD

  async updateEducation(resumeId, educationId, educationData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations/${educationId}`, {
      method: 'PATCH',
      body: educationData,
    });
  },

  async addEducation(resumeId, educationData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations`, {
      method: 'POST',
      body: educationData,
    });
  },

  async deleteEducation(resumeId, educationId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations/${educationId}`, {
      method: 'DELETE',
    });
  },
};
