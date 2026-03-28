/**
 * GitLab API Type Definitions
 * JSDoc type definitions for GitLab API v4
 */

/**
 * @typedef {Object} GitLabProject
 * @property {number} id - Project ID
 * @property {string} name - Project name
 * @property {string} name_with_namespace - Project name with namespace
 * @property {string} path - Repository path
 * @property {string} path_with_namespace - Full repository path
 * @property {string} description - Project description
 * @property {string} default_branch - Default branch name
 * @property {string} visibility - visibility level (private, internal, public)
 * @property {string} web_url - Web URL
 * @property {string} ssh_url_to_repo - SSH URL
 * @property {string} http_url_to_repo - HTTP URL
 * @property {string} last_activity_at - Last activity timestamp
 */

/**
 * @typedef {Object} GitLabUser
 * @property {number} id - User ID
 * @property {string} username - Username
 * @property {string} name - Full name
 * @property {string} state - User state (active, blocked)
 * @property {string} avatar_url - Avatar URL
 * @property {string} web_url - Profile URL
 */

/**
 * @typedef {Object} GitLabPipeline
 * @property {number} id - Pipeline ID
 * @property {string} status - Status (pending, running, success, failed, canceled, skipped, manual)
 * @property {string} ref - Git reference (branch/tag)
 * @property {string} sha - Commit SHA
 * @property {string} before_sha - Previous commit SHA
 * @property {string} web_url - Web URL
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 * @property {string} [started_at] - Start timestamp
 * @property {string} [finished_at] - Finish timestamp
 * @property {number} [duration] - Duration in seconds
 * @property {number} [queued_duration] - Queued duration in seconds
 * @property {GitLabUser} user - Pipeline creator
 */

/**
 * @typedef {Object} GitLabJob
 * @property {number} id - Job ID
 * @property {string} name - Job name
 * @property {string} stage - Pipeline stage
 * @property {string} status - Status
 * @property {string} created_at - Creation timestamp
 * @property {string} started_at - Start timestamp
 * @property {string} finished_at - Finish timestamp
 * @property {number} [duration] - Duration in seconds
 * @property {string} [queued_duration] - Queued duration
 * @property {string} [trace] - Job logs
 * @property {GitLabUser} user - Job creator
 * @property {number} commit_id - Commit ID
 * @property {string} commit_message - Commit message
 */

/**
 * @typedef {Object} GitLabRunner
 * @property {number} id - Runner ID
 * @property {string} name - Runner name
 * @property {string} description - Runner description
 * @property {boolean} active - Is active
 * @property {boolean} paused - Is paused
 * @property {string} is_shared - Is shared runner
 * @property {string} run_untagged - Run untagged jobs
 * @property {string} locked - Is locked
 * @property {string} [tags] - Runner tags
 */

/**
 * @typedef {Object} GitLabVariable
 * @property {string} key - Variable key
 * @property {string} value - Variable value
 * @property {boolean} protected - Is protected
 * @property {boolean} masked - Is masked
 * @property {string} environment_scope - Environment scope
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

// Export type markers for documentation
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
