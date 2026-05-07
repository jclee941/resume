import { HttpClient } from './http-client.js';
import { JobsEndpoint, CompaniesEndpoint, AuthEndpoint } from './endpoints/jobs.js';
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
  }

  setCookies(cookies) {
    this.#client.setCookies(cookies);
  }

  getCookies() {
    return this.#client.getCookies();
  }

  /**
   * Delegate to HttpClient's chaosRequest for Chaos API calls
   * @param {string} endpoint - Chaos API endpoint (e.g., '/resumes')
   * @param {object} options - Request options
   */
  async chaosRequest(endpoint, options = {}) {
    return this.#client.chaosRequest(endpoint, options);
  }

  async request(endpoint, options = {}) {
    return this.#client.request(endpoint, options);
  }

  async snsRequest(endpoint, options = {}) {
    return this.#client.snsRequest(endpoint, options);
  }

  async legacySnsRequest(endpoint, options = {}) {
    return this.#client.legacySnsRequest(endpoint, options);
  }

  async snsProfileRequest(endpoint, options = {}) {
    return this.#client.snsProfileRequest(endpoint, options);
  }

  async searchJobs(options) {
    return this.jobs.search(options);
  }

  async searchByKeyword(keyword, options) {
    return this.jobs.searchByKeyword(keyword, options);
  }

  async getJobDetail(jobId) {
    return this.jobs.getDetail(jobId);
  }

  async getTags() {
    return this.jobs.getTags();
  }

  async getCompany(companyId) {
    return this.companies.get(companyId);
  }

  async getCompanyJobs(companyId, options) {
    return this.companies.getJobs(companyId, options);
  }

  async login(email, password) {
    return this.auth.login(email, password);
  }

  async getProfile() {
    return this.profile.get();
  }

  async getSnsProfile() {
    return this.profile.getSnsProfile();
  }

  async updateProfile(profileData) {
    return this.profile.update(profileData);
  }

  async getApplications(options) {
    return this.profile.getApplications(options);
  }

  async getBookmarks(options) {
    return this.profile.getBookmarks(options);
  }

  async getResumes() {
    return this.profile.getResumes();
  }

  async getResumeList() {
    return this.resume.list();
  }

  async getResumeDetail(resumeId) {
    return this.resume.getDetail(resumeId);
  }

  async saveResume(resumeId, data) {
    if (data === undefined) {
      return this.regenerateResumePdf(resumeId);
    }
    return this.resume.save(resumeId, data);
  }

  async updateResumeStatus(resumeId, isPublic) {
    return this.resume.updateStatus(resumeId, isPublic);
  }

  async regenerateResumePdf(resumeId) {
    return this.resume.regeneratePdf(resumeId);
  }

  async apply(jobId, resumeId = null) {
    const body = resumeId ? { resume_id: resumeId } : {};
    return this.chaosRequest('/applications/v1', {
      method: 'POST',
      headers: { Referer: `https://www.wanted.co.kr/wd/${jobId}` },
      body: {
        job_id: parseInt(jobId, 10),
        ...body,
      },
    });
  }

  async updateResumeFields(resumeId, fields) {
    return this.resume.save(resumeId, fields);
  }

  async updateCareer(resumeId, careerId, careerData) {
    return this.resumeCareer.update(resumeId, careerId, careerData);
  }

  async addCareer(resumeId, careerData) {
    return this.resumeCareer.add(resumeId, careerData);
  }

  async deleteCareer(resumeId, careerId) {
    return this.resumeCareer.delete(resumeId, careerId);
  }

  async addProject(resumeId, careerId, projectData) {
    return this.resumeCareer.addProject(resumeId, careerId, projectData);
  }

  async deleteProject(resumeId, careerId, projectId) {
    return this.resumeCareer.deleteProject(resumeId, careerId, projectId);
  }

  async updateEducation(resumeId, educationId, educationData) {
    return this.resumeEducation.update(resumeId, educationId, educationData);
  }

  async addEducation(resumeId, educationData) {
    return this.resumeEducation.add(resumeId, educationData);
  }

  async deleteEducation(resumeId, educationId) {
    return this.resumeEducation.delete(resumeId, educationId);
  }

  async addSkill(resumeId, tagTypeId) {
    const skillData = typeof tagTypeId === 'object' ? tagTypeId : { tag_type_id: tagTypeId };
    return this.resumeSkills.add(resumeId, skillData);
  }

  async deleteSkill(resumeId, skillId) {
    return this.resumeSkills.delete(resumeId, skillId);
  }

  async updateActivity(resumeId, activityId, activityData) {
    return this.resumeActivity.update(resumeId, activityId, activityData);
  }

  async addActivity(resumeId, activityData) {
    return this.resumeActivity.add(resumeId, activityData);
  }

  async deleteActivity(resumeId, activityId) {
    return this.resumeActivity.delete(resumeId, activityId);
  }

  async updateLanguageCert(resumeId, certId, certData) {
    return this.chaosRequest(`/resumes/v2/${resumeId}/language_certs/${certId}`, {
      method: 'PUT',
      body: certData,
    });
  }

  async addLanguageCert(resumeId, certData) {
    return this.resumeLanguageCert.add(resumeId, certData);
  }

  async deleteLanguageCert(resumeId, certId) {
    return this.resumeLanguageCert.delete(resumeId, certId);
  }
}

export { WantedAPIError } from './http-client.js';
export { JOB_CATEGORIES } from './types.js';
export default WantedAPI;
