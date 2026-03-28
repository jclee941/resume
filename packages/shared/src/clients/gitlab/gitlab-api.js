/**
 * GitLab API Client
 * OAuth2-enabled client for GitLab API v4
 */

import { GitLabHttpClient } from './http-client.js';

/**
 * @typedef {Object} GitLabClientConfig
 * @property {string} [baseUrl] - GitLab instance URL
 * @property {string} [appId] - OAuth application ID
 * @property {string} [clientSecret] - OAuth client secret
 */

/**
 * @typedef {Object} PipelineVariable
 * @property {string} key - Variable name
 * @property {string} value - Variable value
 * @property {boolean} [protected=false] - Protected variable
 * @property {boolean} [masked=false] - Masked variable
 * @property {string} [environment_scope='*'] - Environment scope
 */

/**
 * @typedef {Object} Pipeline
 * @property {number} id - Pipeline ID
 * @property {string} status - Pipeline status (pending, running, success, failed, canceled)
 * @property {string} ref - Git reference
 * @property {string} sha - Commit SHA
 * @property {string} web_url - Pipeline web URL
 */

/**
 * @typedef {Object} Job
 * @property {number} id - Job ID
 * @property {string} name - Job name
 * @property {string} status - Job status
 * @property {string} stage - Pipeline stage
 * @property {string} started_at - Start timestamp
 * @property {string} finished_at - Finish timestamp
 */

/**
 * GitLab API Client with OAuth2 authentication
 */
export class GitLabAPI {
  /** @type {GitLabHttpClient} */
  #client;

  /**
   * @param {GitLabClientConfig} config
   */
  constructor(config = {}) {
    this.#client = new GitLabHttpClient({
      baseUrl: config.baseUrl,
      appId: config.appId,
      clientSecret: config.clientSecret,
      scope: 'api read_api read_repository',
    });
  }

  /**
   * Get HTTP client for advanced usage
   * @returns {GitLabHttpClient}
   */
  getHttpClient() {
    return this.#client;
  }

  // =========================================================================
  // Projects
  // =========================================================================

  /**
   * List projects (requires api scope)
   * @param {Object} [options] - Query options
   * @param {string} [options.membership] - Limit to projects user is a member
   * @param {string} [options.search] - Search projects by name
   * @param {number} [options.per_page] - Results per page (max 100)
   * @param {number} [options.page] - Page number
   * @returns {Promise<Array>} List of projects
   */
  async listProjects(options = {}) {
    return this.#client.request('/projects', {
      query: {
        membership: options.membership ? true : undefined,
        search: options.search,
        per_page: options.per_page || 20,
        page: options.page || 1,
        order_by: 'last_activity_at',
        sort: 'desc',
      },
    });
  }

  /**
   * Get a single project
   * @param {string|number} projectId - Project ID or path-encoded path
   * @returns {Promise<Object>} Project details
   */
  async getProject(projectId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}`);
  }

  /**
   * Get project variables
   * @param {string|number} projectId - Project ID or path
   * @returns {Promise<Array<PipelineVariable>>} List of CI/CD variables
   */
  async getProjectVariables(projectId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/variables`);
  }

  /**
   * Create a project variable
   * @param {string|number} projectId - Project ID or path
   * @param {PipelineVariable} variable - Variable to create
   * @returns {Promise<Object>} Created variable
   */
  async createProjectVariable(projectId, variable) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/variables`, {
      method: 'POST',
      body: {
        key: variable.key,
        value: variable.value,
        protected: variable.protected || false,
        masked: variable.masked || false,
        environment_scope: variable.environment_scope || '*',
      },
    });
  }

  /**
   * Update a project variable
   * @param {string|number} projectId - Project ID or path
   * @param {string} key - Variable key
   * @param {Partial<PipelineVariable>} variable - Variable updates
   * @returns {Promise<Object>} Updated variable
   */
  async updateProjectVariable(projectId, key, variable) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/variables/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: {
        value: variable.value,
        protected: variable.protected,
        masked: variable.masked,
        environment_scope: variable.environment_scope,
      },
    });
  }

  /**
   * Delete a project variable
   * @param {string|number} projectId - Project ID or path
   * @param {string} key - Variable key
   * @returns {Promise<void>}
   */
  async deleteProjectVariable(projectId, key) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/variables/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  // =========================================================================
  // Pipelines
  // =========================================================================

  /**
   * List pipelines for a project
   * @param {string|number} projectId - Project ID or path
   * @param {Object} [options] - Query options
   * @param {string} [options.ref] - Filter by branch/tag
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.order_by] - Order field
   * @param {string} [options.sort] - Sort direction
   * @returns {Promise<Array<Pipeline>>} List of pipelines
   */
  async listPipelines(projectId, options = {}) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipelines`, {
      query: {
        ref: options.ref,
        status: options.status,
        order_by: options.order_by || 'id',
        sort: options.sort || 'desc',
        per_page: options.per_page || 20,
      },
    });
  }

  /**
   * Get a single pipeline
   * @param {string|number} projectId - Project ID or path
   * @param {number} pipelineId - Pipeline ID
   * @returns {Promise<Pipeline>} Pipeline details
   */
  async getPipeline(projectId, pipelineId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipelines/${pipelineId}`);
  }

  /**
   * Create a new pipeline
   * @param {string|number} projectId - Project ID or path
   * @param {string} ref - Git reference (branch/tag)
   * @param {Array<{key: string, value: string}>} [variables] - Pipeline variables
   * @returns {Promise<Pipeline>} Created pipeline
   */
  async createPipeline(projectId, ref, variables = []) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipeline`, {
      method: 'POST',
      body: {
        ref,
        variables: variables.length > 0 ? variables : undefined,
      },
    });
  }

  /**
   * Retry a failed pipeline
   * @param {string|number} projectId - Project ID or path
   * @param {number} pipelineId - Pipeline ID
   * @returns {Promise<Pipeline>} Retried pipeline
   */
  async retryPipeline(projectId, pipelineId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipelines/${pipelineId}/retry`, {
      method: 'POST',
    });
  }

  /**
   * Cancel a running pipeline
   * @param {string|number} projectId - Project ID or path
   * @param {number} pipelineId - Pipeline ID
   * @returns {Promise<Pipeline>} Canceled pipeline
   */
  async cancelPipeline(projectId, pipelineId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipelines/${pipelineId}/cancel`, {
      method: 'POST',
    });
  }

  // =========================================================================
  // Jobs
  // =========================================================================

  /**
   * List jobs for a pipeline
   * @param {string|number} projectId - Project ID or path
   * @param {number} pipelineId - Pipeline ID
   * @param {Object} [options] - Query options
   * @returns {Promise<Array<Job>>} List of jobs
   */
  async listPipelineJobs(projectId, pipelineId, options = {}) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/pipelines/${pipelineId}/jobs`, {
      query: {
        per_page: options.per_page || 100,
        page: options.page || 1,
      },
    });
  }

  /**
   * List all jobs for a project
   * @param {string|number} projectId - Project ID or path
   * @param {Object} [options] - Query options
   * @param {string} [options.scope] - Job scope
   * @param {string} [options.status] - Job status
   * @returns {Promise<Array<Job>>} List of jobs
   */
  async listJobs(projectId, options = {}) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/jobs`, {
      query: {
        scope: options.scope,
        status: options.status,
        per_page: options.per_page || 100,
        page: options.page || 1,
      },
    });
  }

  /**
   * Get a single job
   * @param {string|number} projectId - Project ID or path
   * @param {number} jobId - Job ID
   * @returns {Promise<Job>} Job details
   */
  async getJob(projectId, jobId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/jobs/${jobId}`);
  }

  /**
   * Get job trace (logs)
   * @param {string|number} projectId - Project ID or path
   * @param {number} jobId - Job ID
   * @returns {Promise<string>} Job logs
   */
  async getJobTrace(projectId, jobId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/jobs/${jobId}/trace`);
  }

  /**
   * Retry a job
   * @param {string|number} projectId - Project ID or path
   * @param {number} jobId - Job ID
   * @returns {Promise<Job>} Retried job
   */
  async retryJob(projectId, jobId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  // =========================================================================
  // Runners
  // =========================================================================

  /**
   * List project runners
   * @param {string|number} projectId - Project ID or path
   * @returns {Promise<Array>} List of runners
   */
  async listProjectRunners(projectId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/runners`);
  }

  /**
   * Enable a runner for a project
   * @param {string|number} projectId - Project ID or path
   * @param {number} runnerId - Runner ID
   * @param {Object} [options] - Options
   * @param {boolean} [options.locked] - Lock runner to project
   * @param {string} [options.access_level] - Runner access level
   * @returns {Promise<Object>} Result
   */
  async enableRunner(projectId, runnerId, options = {}) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/runners`, {
      method: 'POST',
      body: {
        runner_id: runnerId,
        locked: options.locked,
        access_level: options.access_level,
      },
    });
  }

  /**
   * Disable a runner from a project
   * @param {string|number} projectId - Project ID or path
   * @param {number} runnerId - Runner ID
   * @returns {Promise<void>}
   */
  async disableRunner(projectId, runnerId) {
    const encoded = encodeURIComponent(String(projectId));
    return this.#client.request(`/projects/${encoded}/runners/${runnerId}`, {
      method: 'DELETE',
    });
  }
}

export default GitLabAPI;
