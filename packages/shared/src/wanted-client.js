/** Legacy-compatible facade for the canonical Wanted API client. */
import { WantedClientBase, WantedAPI, WantedAPIError } from './wanted-client-base.js';

export { WantedAPI, WantedAPIError };

export class WantedClient extends WantedClientBase {
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

  async updateResumeFields(resumeId, fields) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}`, {
      method: 'PUT',
      body: fields,
    });
  }

  async updateProfile(profileData) {
    this._requireAuth();
    return this.snsRequest('/profile', {
      method: 'PATCH',
      body: profileData,
    });
  }

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

  async addProject(resumeId, careerId, projectData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}/projects`, {
      method: 'POST',
      body: projectData,
    });
  }

  async deleteProject(resumeId, careerId, projectId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/careers/${careerId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async updateEducation(resumeId, educationId, educationData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations/${educationId}`, {
      method: 'PATCH',
      body: educationData,
    });
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
    return this.chaosRequest(`/resumes/v2/${resumeId}/educations/${educationId}`, {
      method: 'DELETE',
    });
  }

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

  async updateActivity(resumeId, activityId, activityData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities/${activityId}`, {
      method: 'PATCH',
      body: activityData,
    });
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
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async updateLanguageCert(resumeId, certId, certData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'PUT',
      body: certData,
    });
  }

  async addLanguageCert(resumeId, certData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs`, {
      method: 'POST',
      body: certData,
    });
  }

  async deleteLanguageCert(resumeId, certId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'DELETE',
    });
  }
}

export default WantedClient;
