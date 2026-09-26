import { MESSAGE_TYPES, PRIORITY } from '../../queues/queue-message-constants.js';
import { normalizeApplicationPlatform } from '../../workflows/application/application-platform-catalog.js';
import { jsonResponse } from '../../middleware/cors.js';

const NATIVE_MODES = new Set(['cf-native', 'cloudflare-native', 'workflow', 'queue']);
const AUTO_NATIVE_PLATFORMS = new Set(['jobkorea', 'saramin']);

/**
 * @typedef {{
 *   cloudflareNative?: boolean;
 *   cfNative?: boolean;
 *   mode?: string;
 *   executionMode?: string;
 *   priority?: string | number;
 *   queue?: boolean;
 *   triggerType?: string;
 *   platforms?: string[];
 *   searchCriteria?: Record<string, unknown>;
 *   keywords?: string[] | string;
 *   keyword?: string;
 *   location?: string;
 *   candidates?: Array<Record<string, unknown>>;
 *   explicitCandidates?: Array<Record<string, unknown>>;
 *   resumeId?: string;
 *   autoApprove?: boolean;
 *   autoApproveThreshold?: number;
 *   minMatchScore?: number;
 *   minScore?: number;
 *   maxApplications?: number;
 *   maxDailyApplications?: number;
 *   dryRun?: boolean;
 *   atsStub?: boolean;
 *   explicitSubmit?: boolean;
 *   submitOptIn?: boolean;
 *   runId?: string;
 *   [key: string]: unknown;
 * }} NativeDispatchBody
 *
 * @typedef {{
 *   CRAWL_TASKS?: { send(message: unknown): Promise<void> };
 *   APPLICATION_WORKFLOW?: { create(options: { params: unknown }): Promise<{ id: string }> };
 *   [key: string]: unknown;
 * }} NativeDispatchEnv
 *
 * @typedef {import('./explicit-candidates.js').ValidExplicitCandidates} NativeExplicitCandidates
 */

/**
 * @param {NativeDispatchBody | null | undefined} body
 * @returns {boolean}
 */
function isCloudflareNativeRequest(body) {
  return (
    body?.cloudflareNative === true ||
    body?.cfNative === true ||
    NATIVE_MODES.has(String(body?.mode || body?.executionMode || '').toLowerCase())
  );
}

/**
 * @param {{
 *   body: NativeDispatchBody;
 *   env?: NativeDispatchEnv | null;
 *   explicitCandidates?: NativeExplicitCandidates | null;
 *   dryRun?: boolean;
 * }} options
 * @returns {boolean}
 */
export function shouldDispatchCloudflareNative({ body, env, explicitCandidates, dryRun }) {
  if (isCloudflareNativeRequest(body)) return true;
  if (dryRun !== false || !hasCloudflareNativeBinding(env)) return false;
  if (!explicitCandidates?.hasExplicitCandidates || explicitCandidates.jobs.length === 0)
    return false;
  return explicitCandidates.jobs.every((/** @type {Record<string, unknown>} */ job) =>
    AUTO_NATIVE_PLATFORMS.has(getCandidatePlatform(job))
  );
}

/**
 * @param {{
 *   body: NativeDispatchBody;
 *   env?: NativeDispatchEnv | null;
 *   explicitCandidates?: NativeExplicitCandidates | null;
 * }} options
 * @returns {Promise<Response>}
 */
export async function dispatchCloudflareNativeAutoApply({ body, env, explicitCandidates }) {
  const unsupportedPlatform = findUnsupportedExplicitNativePlatform(explicitCandidates);
  if (unsupportedPlatform) {
    return jsonResponse(
      {
        success: false,
        error: `Unsupported Cloudflare native platform: ${unsupportedPlatform}`,
        errorCode: 'UNSUPPORTED_CF_NATIVE_PLATFORM',
      },
      400
    );
  }

  const payload = buildApplicationWorkflowPayload(body, explicitCandidates);
  const queue = env?.CRAWL_TASKS;
  const workflow = env?.APPLICATION_WORKFLOW;

  if (shouldUseQueue(body, queue, workflow)) {
    const message = {
      type: MESSAGE_TYPES.APPLY,
      payload,
      priority: body.priority || PRIORITY.BACKGROUND,
      correlationId: payload.runId,
    };
    await /** @type {NonNullable<typeof queue>} */ (queue).send(message);
    return acceptedResponse({
      dispatch: 'queue',
      queue: 'CRAWL_TASKS',
      runId: payload.runId,
      workflow: payload,
    });
  }

  if (workflow?.create) {
    const instance = await workflow.create({ params: payload });
    return acceptedResponse({
      dispatch: 'workflow',
      instanceId: instance.id,
      runId: payload.runId,
      workflow: payload,
    });
  }

  return jsonResponse(
    {
      success: false,
      error: 'Cloudflare native auto-apply requires APPLICATION_WORKFLOW or CRAWL_TASKS binding',
      errorCode: 'CF_NATIVE_AUTO_APPLY_UNAVAILABLE',
      runId: payload.runId,
    },
    503
  );
}

/**
 * @param {NativeDispatchEnv | null | undefined} env
 * @returns {boolean}
 */
function hasCloudflareNativeBinding(env) {
  return Boolean(env?.APPLICATION_WORKFLOW?.create || env?.CRAWL_TASKS?.send);
}

/**
 * @param {NativeDispatchBody | null | undefined} body
 * @param {{ send(message: unknown): Promise<void> } | null | undefined} queue
 * @param {{ create(options: { params: unknown }): Promise<{ id: string }> } | null | undefined} workflow
 * @returns {unknown}
 */
function shouldUseQueue(body, queue, workflow) {
  const mode = String(body?.mode || body?.executionMode || '').toLowerCase();
  return queue?.send && (body?.queue === true || mode === 'queue' || !workflow?.create);
}

/**
 * @param {NativeDispatchBody} body
 * @param {NativeExplicitCandidates | null | undefined} explicitCandidates
 * @returns {Record<string, unknown> & { runId?: string }}
 */
function buildApplicationWorkflowPayload(body, explicitCandidates) {
  const rawCandidates = explicitCandidates?.hasExplicitCandidates
    ? explicitCandidates.jobs
    : readCandidateInput(body);
  const candidates = rawCandidates.map((candidate) => normalizeCandidatePlatform(candidate));
  const candidatePlatforms = candidates
    .map((candidate) => candidate?.source || candidate?.platform || candidate?.loginPlatform)
    .filter(Boolean);
  return {
    triggerType: body.triggerType || 'cf-native-auto-apply',
    platforms: normalizeWorkflowPlatforms(body.platforms || candidatePlatforms),
    searchCriteria: body.searchCriteria || {
      keywords: body.keywords,
      keyword: Array.isArray(body.keywords) ? body.keywords[0] : body.keyword,
      location: body.location,
    },
    candidates,
    resumeId: body.resumeId || 'default',
    autoApprove: body.autoApprove === true,
    autoApproveThreshold: body.autoApproveThreshold ?? 75,
    minMatchScore: body.minMatchScore ?? body.minScore ?? 60,
    maxDailyApplications: body.maxApplications ?? body.maxDailyApplications ?? 10,
    dryRun: body.dryRun !== false,
    atsStub: body.atsStub === true,
    explicitSubmit: body.explicitSubmit === true,
    submitOptIn: body.submitOptIn === true,
    runId: body.runId,
    source: 'cf-native',
  };
}

/**
 * @param {NativeDispatchBody} body
 * @returns {Array<Record<string, unknown>>}
 */
function readCandidateInput(body) {
  const candidates = Object.hasOwn(body, 'candidates') ? body.candidates : body.explicitCandidates;
  return Array.isArray(candidates) ? candidates : [];
}

/**
 * @param {NativeExplicitCandidates | null | undefined} explicitCandidates
 * @returns {string | null}
 */
function findUnsupportedExplicitNativePlatform(explicitCandidates) {
  if (!explicitCandidates?.hasExplicitCandidates) return null;
  const unsupported = explicitCandidates.jobs
    .map((/** @type {Record<string, unknown>} */ job) => getCandidatePlatform(job))
    .find((/** @type {string} */ platform) => !AUTO_NATIVE_PLATFORMS.has(platform));
  return unsupported || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} candidate
 * @returns {Record<string, unknown> | null | undefined}
 */
function normalizeCandidatePlatform(candidate) {
  if (!candidate || typeof candidate !== 'object') return candidate;
  const source = getCandidatePlatform(candidate);
  if (!source) return candidate;
  return { ...candidate, source };
}

/**
 * @param {unknown} platforms
 * @returns {unknown}
 */
function normalizeWorkflowPlatforms(platforms) {
  if (!Array.isArray(platforms)) return platforms;
  return platforms.map((platform) => normalizeApplicationPlatform(platform)).filter(Boolean);
}

/**
 * @param {Record<string, unknown> | null | undefined} candidate
 * @returns {string}
 */
function getCandidatePlatform(candidate) {
  return normalizeApplicationPlatform(
    candidate?.source || candidate?.platform || candidate?.loginPlatform
  );
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Response}
 */
function acceptedResponse(body) {
  return jsonResponse(
    {
      success: true,
      accepted: true,
      ...body,
    },
    202
  );
}
