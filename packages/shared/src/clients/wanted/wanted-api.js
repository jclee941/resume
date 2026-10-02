import { HttpClient } from './http-client.js';
import { JobsEndpoint, CompaniesEndpoint, AuthEndpoint } from './endpoints/jobs.js';
import { ApplicationsEndpoint } from './endpoints/applications.js';
import {
  ProfileEndpoint,
  ExperienceEndpoint,
  EducationEndpoint,
  SkillsEndpoint,
} from './endpoints/profile.js';
import {
  ResumeEndpoint,
  ResumeCareerEndpoint,
  ResumeEducationEndpoint,
  ResumeSkillsEndpoint,
  ResumeActivityEndpoint,
  ResumeLanguageCertEndpoint,
} from './endpoints/resume.js';

export class WantedAPI {
  #client;
  jobs;
  companies;
  auth;
  profile;
  experience;
  education;
  skills;
  resume;
  resumeCareer;
  resumeEducation;
  resumeSkills;
  resumeActivity;
  resumeLanguageCert;
  applications;

  /**
   * @param {string | null} [cookies]
   */
  constructor(cookies = null) {
    this.#client = new HttpClient(cookies);
    this.jobs = new JobsEndpoint(this.#client);
    this.companies = new CompaniesEndpoint(this.#client);
    this.auth = new AuthEndpoint(this.#client);
    this.profile = new ProfileEndpoint(this.#client);
    this.experience = new ExperienceEndpoint(this.#client);
    this.education = new EducationEndpoint(this.#client);
    this.skills = new SkillsEndpoint(this.#client);
    this.resume = new ResumeEndpoint(this.#client);
    this.resumeCareer = new ResumeCareerEndpoint(this.#client);
    this.resumeEducation = new ResumeEducationEndpoint(this.#client);
    this.resumeSkills = new ResumeSkillsEndpoint(this.#client);
    this.resumeActivity = new ResumeActivityEndpoint(this.#client);
    this.resumeLanguageCert = new ResumeLanguageCertEndpoint(this.#client);
    this.applications = new ApplicationsEndpoint(this.#client);
  }

  /**
   * @param {string | null} cookies
   */
  setCookies(cookies) {
    this.#client.setCookies(cookies);
  }

  getCookies() {
    return this.#client.getCookies();
  }

  /**
   * Delegate to HttpClient's chaosRequest for Chaos API calls
   * @param {string} endpoint - Chaos API endpoint (e.g., '/resumes')
   * @param {import('./http-client.js').RequestOptions} [options] - Request options
   */
  async chaosRequest(endpoint, options = {}) {
    return this.#client.chaosRequest(endpoint, options);
  }

  /**
   * @param {string} endpoint
   * @param {import('./http-client.js').RequestOptions} [options]
   */
  async request(endpoint, options = {}) {
    return this.#client.request(endpoint, options);
  }

  /**
   * @param {string} endpoint
   * @param {import('./http-client.js').RequestOptions} [options]
   */
  async snsRequest(endpoint, options = {}) {
    return this.#client.snsRequest(endpoint, options);
  }

  /**
   * @param {string} endpoint
   * @param {import('./http-client.js').RequestOptions} [options]
   */
  async legacySnsRequest(endpoint, options = {}) {
    return this.#client.legacySnsRequest(endpoint, options);
  }

  /**
   * @param {string} endpoint
   * @param {import('./http-client.js').RequestOptions} [options]
   */
  async snsProfileRequest(endpoint, options = {}) {
    return this.#client.snsProfileRequest(endpoint, options);
  }

  /**
   * @param {import('./endpoints/jobs.js').JobSearchOptions} [options]
   */
  async searchJobs(options) {
    return this.jobs.search(options);
  }

  /**
   * @param {string} keyword
   * @param {import('./endpoints/jobs.js').KeywordSearchOptions} [options]
   */
  async searchByKeyword(keyword, options) {
    return this.jobs.searchByKeyword(keyword, options);
  }

  /**
   * @param {string | number} jobId
   */
  async getJobDetail(jobId) {
    return this.jobs.getDetail(jobId);
  }

  async getTags() {
    return this.jobs.getTags();
  }

  /**
   * @param {string | number} companyId
   */
  async getCompany(companyId) {
    return this.companies.get(companyId);
  }

  /**
   * @param {string | number} companyId
   * @param {import('./endpoints/jobs.js').CompanyJobsOptions} [options]
   */
  async getCompanyJobs(companyId, options) {
    return this.companies.getJobs(companyId, options);
  }

  /**
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    return this.auth.login(email, password);
  }

  async getProfile() {
    return this.profile.get();
  }

  async getSnsProfile() {
    return this.profile.getSnsProfile();
  }

  /**
   * @param {Record<string, unknown>} profileData
   */
  async updateProfile(profileData) {
    return this.profile.update(profileData);
  }

  /**
   * @param {Record<string, unknown>} [options]
   */
  async getApplications(options) {
    return this.profile.getApplications(options);
  }

  /**
   * @param {Record<string, unknown>} [options]
   */
  async getBookmarks(options) {
    return this.profile.getBookmarks(options);
  }

  async getResumes() {
    return this.profile.getResumes();
  }

  async getResumeList() {
    return this.resume.list();
  }

  /**
   * @param {string | number} resumeId
   */
  async getResumeDetail(resumeId) {
    return this.resume.getDetail(resumeId);
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} [data]
   */
  async saveResume(resumeId, data) {
    if (data === undefined) {
      return this.regenerateResumePdf(resumeId);
    }
    return this.resume.save(resumeId, data);
  }

  /**
   * @param {string | number} resumeId
   * @param {boolean} isPublic
   */
  async updateResumeStatus(resumeId, isPublic) {
    return this.resume.updateStatus(resumeId, isPublic);
  }

  /**
   * @param {string | number} resumeId
   */
  async regenerateResumePdf(resumeId) {
    return this.resume.regeneratePdf(resumeId);
  }

  /**
   * @param {string | number} jobId
   * @param {{ resumeKey?: string | null }} [options]
   */
  async apply(jobId, options) {
    return this.applications.apply(jobId, options);
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} fields
   */
  async updateResumeFields(resumeId, fields) {
    return this.resume.save(resumeId, fields);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {Record<string, unknown>} careerData
   */
  async updateCareer(resumeId, careerId, careerData) {
    return this.resumeCareer.update(resumeId, careerId, careerData);
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} careerData
   */
  async addCareer(resumeId, careerData) {
    return this.resumeCareer.add(resumeId, careerData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   */
  async deleteCareer(resumeId, careerId) {
    return this.resumeCareer.delete(resumeId, careerId);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {Record<string, unknown>} projectData
   */
  async addProject(resumeId, careerId, projectData) {
    return this.resumeCareer.addProject(resumeId, careerId, projectData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} careerId
   * @param {string | number} projectId
   */
  async deleteProject(resumeId, careerId, projectId) {
    return this.resumeCareer.deleteProject(resumeId, careerId, projectId);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} educationId
   * @param {Record<string, unknown>} educationData
   */
  async updateEducation(resumeId, educationId, educationData) {
    return this.resumeEducation.update(resumeId, educationId, educationData);
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} educationData
   */
  async addEducation(resumeId, educationData) {
    return this.resumeEducation.add(resumeId, educationData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} educationId
   */
  async deleteEducation(resumeId, educationId) {
    return this.resumeEducation.delete(resumeId, educationId);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number | Record<string, unknown>} tagTypeId
   */
  async addSkill(resumeId, tagTypeId) {
    const skillData = typeof tagTypeId === 'object' ? tagTypeId : { tag_type_id: tagTypeId };
    return this.resumeSkills.add(resumeId, skillData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} skillId
   */
  async deleteSkill(resumeId, skillId) {
    return this.resumeSkills.delete(resumeId, skillId);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} activityId
   * @param {Record<string, unknown>} activityData
   */
  async updateActivity(resumeId, activityId, activityData) {
    return this.resumeActivity.update(resumeId, activityId, activityData);
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} activityData
   */
  async addActivity(resumeId, activityData) {
    return this.resumeActivity.add(resumeId, activityData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} activityId
   */
  async deleteActivity(resumeId, activityId) {
    return this.resumeActivity.delete(resumeId, activityId);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} certId
   * @param {Record<string, unknown>} certData
   */
  async updateLanguageCert(resumeId, certId, certData) {
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'PUT',
      body: certData,
    });
  }

  /**
   * @param {string | number} resumeId
   * @param {Record<string, unknown>} certData
   */
  async addLanguageCert(resumeId, certData) {
    return this.resumeLanguageCert.add(resumeId, certData);
  }

  /**
   * @param {string | number} resumeId
   * @param {string | number} certId
   */
  async deleteLanguageCert(resumeId, certId) {
    return this.resumeLanguageCert.delete(resumeId, certId);
  }
}

export { WantedAPIError } from './http-client.js';
export { JOB_CATEGORIES } from './types.js';
export default WantedAPI;
