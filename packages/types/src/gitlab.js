/**
 * @typedef {Object} GitLabProject
 * @property {number} id
 * @property {string} name
 * @property {string} name_with_namespace
 * @property {string} path
 * @property {string} path_with_namespace
 * @property {string} description
 * @property {string} default_branch
 * @property {string} visibility
 * @property {string} web_url
 * @property {string} ssh_url_to_repo
 * @property {string} http_url_to_repo
 * @property {string} last_activity_at
 */

/**
 * @typedef {Object} GitLabUser
 * @property {number} id
 * @property {string} username
 * @property {string} name
 * @property {string} state
 * @property {string} avatar_url
 * @property {string} web_url
 */

/**
 * @typedef {Object} GitLabPipeline
 * @property {number} id
 * @property {string} status
 * @property {string} ref
 * @property {string} sha
 * @property {string} before_sha
 * @property {string} web_url
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [started_at]
 * @property {string} [finished_at]
 * @property {number} [duration]
 * @property {number} [queued_duration]
 * @property {GitLabUser} user
 */

/**
 * @typedef {Object} GitLabJob
 * @property {number} id
 * @property {string} name
 * @property {string} stage
 * @property {string} status
 * @property {string} created_at
 * @property {string} started_at
 * @property {string} finished_at
 * @property {number} [duration]
 * @property {string} [queued_duration]
 * @property {string} [trace]
 * @property {GitLabUser} user
 * @property {number} commit_id
 * @property {string} commit_message
 */

/**
 * @typedef {Object} GitLabRunner
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} active
 * @property {boolean} paused
 * @property {string} is_shared
 * @property {string} run_untagged
 * @property {string} locked
 * @property {string} [tags]
 */

/**
 * @typedef {Object} GitLabVariable
 * @property {string} key
 * @property {string} value
 * @property {boolean} protected
 * @property {boolean} masked
 * @property {string} environment_scope
 */

/**
 * @typedef {'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual' | 'scheduled'} PipelineStatus
 */

/**
 * @typedef {'success' | 'failed' | 'running' | 'pending' | 'canceled' | 'skipped' | 'manual' | 'scheduled' | 'created'} JobStatus
 */

/**
 * @typedef {'api' | 'read_api' | 'write_repository' | 'read_repository' | 'openid' | 'profile' | 'email'} OAuthScope
 */

export const GitLabTypes = {
  GitLabProject: 'GitLabProject',
  GitLabUser: 'GitLabUser',
  GitLabPipeline: 'GitLabPipeline',
  GitLabJob: 'GitLabJob',
  GitLabRunner: 'GitLabRunner',
  GitLabVariable: 'GitLabVariable',
  PipelineStatus: 'PipelineStatus',
  JobStatus: 'JobStatus',
  OAuthScope: 'OAuthScope',
};
