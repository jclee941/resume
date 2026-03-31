/**
 * Profile update domain methods for WantedClient.
 * Mixed into WantedClient.prototype via Object.assign.
 *
 * All methods assume `this` is a WantedClient instance
 * with `_requireAuth()`, `snsRequest()`, and `chaosRequest()` available.
 */

export const profileApiMethods = {
  async updateProfile(profileData) {
    this._requireAuth();
    return this.snsRequest('/profile', {
      method: 'PATCH',
      body: profileData,
    });
  },

  async updateResumeFields(resumeId, fields) {
    this._requireAuth();
    return this.chaosRequest(`/resumes/v1/${resumeId}`, {
      method: 'PUT',
      body: fields,
    });
  },
};
