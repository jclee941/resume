import { MESSAGE_TYPES, PRIORITY } from '../../queues/queue-message-constants.js';
import { normalizeApplicationPlatform } from '../../workflows/application/application-platform-catalog.js';
import { jsonResponse } from './response.js';

const NATIVE_MODES = new Set(['cf-native', 'cloudflare-native', 'workflow', 'queue']);
const AUTO_NATIVE_PLATFORMS = new Set(['jobkorea', 'saramin']);

export function isCloudflareNativeRequest(body) {
  return (
    body?.cloudflareNative === true ||
    body?.cfNative === true ||
    NATIVE_MODES.has(String(body?.mode || body?.executionMode || '').toLowerCase())
  );
}

export function shouldDispatchCloudflareNative({ body, env, explicitCandidates, dryRun }) {
  if (isCloudflareNativeRequest(body)) return true;
  if (dryRun !== false || !hasCloudflareNativeBinding(env)) return false;
  if (!explicitCandidates?.hasExplicitCandidates || explicitCandidates.jobs.length === 0) return false;
  return explicitCandidates.jobs.every((job) =>
    AUTO_NATIVE_PLATFORMS.has(getCandidatePlatform(job))
  );
}

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
    await queue.send(message);
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

function hasCloudflareNativeBinding(env) {
  return Boolean(env?.APPLICATION_WORKFLOW?.create || env?.CRAWL_TASKS?.send);
}

function shouldUseQueue(body, queue, workflow) {
  const mode = String(body?.mode || body?.executionMode || '').toLowerCase();
  return queue?.send && (body?.queue === true || mode === 'queue' || !workflow?.create);
}

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

function readCandidateInput(body) {
  const candidates = Object.hasOwn(body, 'candidates') ? body.candidates : body.explicitCandidates;
  return Array.isArray(candidates) ? candidates : [];
}

function findUnsupportedExplicitNativePlatform(explicitCandidates) {
  if (!explicitCandidates?.hasExplicitCandidates) return null;
  const unsupported = explicitCandidates.jobs
    .map((job) => getCandidatePlatform(job))
    .find((platform) => !AUTO_NATIVE_PLATFORMS.has(platform));
  return unsupported || null;
}

function normalizeCandidatePlatform(candidate) {
  if (!candidate || typeof candidate !== 'object') return candidate;
  const source = getCandidatePlatform(candidate);
  if (!source) return candidate;
  return { ...candidate, source };
}

function normalizeWorkflowPlatforms(platforms) {
  if (!Array.isArray(platforms)) return platforms;
  return platforms.map((platform) => normalizeApplicationPlatform(platform)).filter(Boolean);
}

function getCandidatePlatform(candidate) {
  return normalizeApplicationPlatform(
    candidate?.source || candidate?.platform || candidate?.loginPlatform
  );
}

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
