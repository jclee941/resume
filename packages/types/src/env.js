/**
 * @typedef {{
 *   get(key: string, options?: unknown): Promise<unknown>;
 *   put(key: string, value: unknown, options?: unknown): Promise<void>;
 *   delete(key: string): Promise<void>;
 *   list(options?: unknown): Promise<unknown>;
 * }} KVNamespace
 *
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first<T = unknown>(colName?: string): Promise<T | null>;
 *       all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: unknown }>;
 *       run(): Promise<{ success: boolean; meta: unknown }>;
 *       raw<T = unknown>(): Promise<T[]>;
 *     };
 *     first<T = unknown>(colName?: string): Promise<T | null>;
 *     all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: unknown }>;
 *     run(): Promise<{ success: boolean; meta: unknown }>;
 *     raw<T = unknown>(): Promise<T[]>;
 *   };
 *   batch?(statements: unknown[]): Promise<unknown[]>;
 *   exec?(query: string): Promise<unknown>;
 * }} D1Database
 *
 * @typedef {{
 *   get(key: string): Promise<unknown>;
 *   put(key: string, value: unknown, options?: unknown): Promise<unknown>;
 *   delete(key: string | string[]): Promise<void>;
 *   head(key: string): Promise<unknown>;
 *   list(options?: unknown): Promise<unknown>;
 * }} R2Bucket
 *
 * @typedef {{
 *   run(model: string, inputs: unknown, options?: unknown): Promise<unknown>;
 * }} Ai
 *
 * @typedef {{
 *   fetch(request: Request | string, init?: RequestInit): Promise<Response>;
 * }} BrowserWorker
 *
 * @typedef {{
 *   send(message: unknown, options?: unknown): Promise<void>;
 *   sendBatch(messages: Iterable<unknown>): Promise<void>;
 * }} Queue
 *
 * @typedef {{
 *   fetch(request: Request | string, init?: RequestInit): Promise<Response>;
 * }} Fetcher
 *
 * @typedef {{
 *   idFromName(name: string): unknown;
 *   idFromString(id: string): unknown;
 *   newUniqueId(options?: unknown): unknown;
 *   get(id: unknown): unknown;
 * }} DurableObjectNamespace
 *
 * @typedef {{
 *   create(options?: unknown): Promise<unknown>;
 *   get(id: string): Promise<unknown>;
 * }} WorkflowNamespace
 */

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
