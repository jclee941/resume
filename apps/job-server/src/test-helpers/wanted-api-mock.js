/**
 * Wanted API mock utility for test helpers.
 * @file apps/job-server/src/test-helpers/wanted-api-mock.js
 */

import { mockResumeData, mockWantedResponse, mockWantedSearchResponse } from './fixtures.js';

// ========================
// Wanted API Mock
// ========================

/**
 * Create a mock Wanted API client
 * @param {Object} [config]
 * @returns {Object} Wanted API mock
 */
export function mockWantedAPI(_config = {}) {
  const calls = [];
  let isAuthenticated = true;
  let shouldFail = false;
  let failError = new Error('Wanted API error');

  const api = {
    /**
     * @returns {Promise<Object>}
     */
    async getProfile() {
      if (shouldFail) throw failError;
      calls.push({ method: 'getProfile' });
      return (
        mockWantedResponse.data?.user || {
          id: 12345,
          name: 'Mock User',
          email: 'mock@example.com',
        }
      );
    },

    /**
     * @returns {Promise<Object>}
     */
    async getResumeList() {
      if (shouldFail) throw failError;
      calls.push({ method: 'getResumeList' });
      return {
        data: [{ id: 'AwcICwcLBAFIAgcDCwUAB01F', title: 'Mock Resume', is_default: true }],
      };
    },

    /**
     * @param {string} resumeId
     * @returns {Promise<Object>}
     */
    async getResumeDetail(resumeId) {
      if (shouldFail) throw failError;
      calls.push({ method: 'getResumeDetail', resumeId });
      return {
        resume: {
          id: resumeId,
          title: 'Mock Resume',
          lang: 'ko',
          is_complete: true,
        },
        careers: mockResumeData.careers,
        educations: mockResumeData.educations,
        skills: mockResumeData.skills,
      };
    },

    /**
     * @param {string} jobId
     * @returns {Promise<Object>}
     */
    async getJobDetail(jobId) {
      if (shouldFail) throw failError;
      calls.push({ method: 'getJobDetail', jobId });
      return (
        mockWantedResponse.data?.job || {
          id: jobId,
          title: 'Mock Job',
          company: { name: 'Mock Company' },
        }
      );
    },

    /**
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async searchJobs(params = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'searchJobs', params });
      return mockWantedResponse.data || { items: [] };
    },

    /**
     * @param {string} query
     * @param {Object} [params]
     * @returns {Promise<Object>}
     */
    async searchByKeyword(query, params = {}) {
      if (shouldFail) throw failError;
      calls.push({ method: 'searchByKeyword', query, params });
      return mockWantedSearchResponse.data || { items: [] };
    },

    /**
     * @param {string} resumeId
     * @param {Object} coverLetter
     * @returns {Promise<boolean>}
     */
    async submitApplication(resumeId, coverLetter) {
      if (shouldFail) throw failError;
      calls.push({ method: 'submitApplication', resumeId, coverLetter });
      return true;
    },

    /**
     * @param {boolean} authenticated
     */
    setAuthenticated(authenticated) {
      isAuthenticated = authenticated;
    },

    /**
     * Simulate API failure
     * @param {boolean} [fail]
     * @param {Error} [error]
     */
    setFailure(fail = true, error = new Error('Wanted API error')) {
      shouldFail = fail;
      failError = error;
    },

    /** @returns {Array} */
    getCalls() {
      return calls;
    },

    /** Clear calls */
    clearCalls() {
      calls.length = 0;
    },

    /** @returns {boolean} */
    isAuthenticated() {
      return isAuthenticated;
    },
  };

  return api;
}
