/**
 * Skill, Activity, and Language Certificate domain methods for WantedClient.
 * Mixed into WantedClient.prototype via Object.assign.
 *
 * All methods assume `this` is a WantedClient instance
 * with `_requireAuth()` and `chaosRequest()` available.
 */

export const skillApiMethods = {
  // Skills CRUD (v1 only — v2 returns 404)

  async addSkill(resumeId, tagTypeId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}/skills`, {
      method: 'POST',
      body: { tag_type_id: tagTypeId },
    });
  },

  async deleteSkill(resumeId, skillId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
  },

  // Activity CRUD

  async updateActivity(resumeId, activityId, activityData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities/${activityId}`, {
      method: 'PATCH',
      body: activityData,
    });
  },

  async addActivity(resumeId, activityData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities`, {
      method: 'POST',
      body: activityData,
    });
  },

  async deleteActivity(resumeId, activityId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  },

  // Language Certificate CRUD

  async updateLanguageCert(resumeId, certId, certData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'PUT',
      body: certData,
    });
  },

  async addLanguageCert(resumeId, certData) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs`, {
      method: 'POST',
      body: certData,
    });
  },

  async deleteLanguageCert(resumeId, certId) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'DELETE',
    });
  },
};
