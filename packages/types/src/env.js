/**
 * Cloudflare Worker bindings — canonical Env interface for all workers.
 *
 * Each worker imports the subset relevant to its bindings; bindings
 * marked optional are not bound by every worker.
 *
 * @typedef {Object} WorkerEnv
 * @property {KVNamespace} [SESSIONS]
 * @property {KVNamespace} [RATE_LIMIT_KV]
 * @property {KVNamespace} [NONCE_KV]
 * @property {D1Database} [DB]
 * @property {D1Database} [JOB_DB]
 * @property {R2Bucket} [R2]
 * @property {Ai} [AI]
 * @property {BrowserWorker} [MYBROWSER]
 * @property {Queue} [crawlTasks]
 * @property {Fetcher} [JOB_DASHBOARD]
 * @property {Fetcher} [ASSETS]
 * @property {DurableObjectNamespace} [BROWSER_SESSION]
 * @property {WorkflowNamespace} [JOB_CRAWLING_WORKFLOW]
 * @property {WorkflowNamespace} [APPLICATION_WORKFLOW]
 * @property {WorkflowNamespace} [RESUME_SYNC_WORKFLOW]
 * @property {WorkflowNamespace} [DAILY_REPORT_WORKFLOW]
 * @property {WorkflowNamespace} [HEALTH_CHECK_WORKFLOW]
 * @property {WorkflowNamespace} [BACKUP_WORKFLOW]
 * @property {WorkflowNamespace} [CLEANUP_WORKFLOW]
 * @property {string} ENVIRONMENT
 * @property {string} [ELASTICSEARCH_INDEX]
 * @property {string} [ADMIN_TOKEN]
 * @property {string} [WEBHOOK_SECRET]
 * @property {string} [ENCRYPTION_KEY]
 * @property {string} [SIGNING_SECRET]
 * @property {string} [CLOUDFLARE_API_TOKEN]
 * @property {string} [TELEGRAM_BOT_TOKEN]
 * @property {string} [TELEGRAM_CHAT_ID]
 */

/**
 * @typedef {WorkerEnv} PortfolioEnv
 */

/**
 * @typedef {Required<Pick<WorkerEnv, 'SESSIONS'|'RATE_LIMIT_KV'|'NONCE_KV'|'DB'|'ENVIRONMENT'>> & WorkerEnv} JobDashboardEnv
 */

export const ENV_TYPE_MARKER = Object.freeze({ kind: 'env-types', source: '@resume/types/env' });
