import { createAutoApplyClients } from './client-factory.js';
import { jsonResponse } from './response.js';
import { runAutoApply } from './run-handler.js';

const SCHEDULED_RUN_ID_PREFIX = 'scheduled-cliproxy-';
const CLIPROXY_PLATFORM = ['cliproxy'];

export async function runScheduledCliproxyAutoApply({
  controller = {},
  env = {},
  clients = createAutoApplyClients(env),
} = {}) {
  if (!isScheduledAutoApplyEnabled(env)) {
    return jsonResponse({
      success: true,
      skipped: true,
      reason: 'cliproxy_auto_apply_disabled',
    });
  }

  return runAutoApply({
    request: createScheduledRequest(createScheduledBody(controller, env)),
    env,
    clients,
  });
}

export default {
  async scheduled(controller, env, ctx) {
    const execution = runScheduledCliproxyAutoApply({ controller, env });
    ctx.waitUntil(execution);
    await execution;
  },
};

function createScheduledBody(controller, env) {
  const body = {
    dryRun: readDryRun(env),
    platforms: CLIPROXY_PLATFORM,
    runId: createScheduledRunId(controller),
  };
  const keywords = readKeywords(env.CLIPROXY_AUTO_APPLY_KEYWORDS);
  const maxApplications = readMaxApplications(env.CLIPROXY_AUTO_APPLY_MAX_APPLICATIONS);

  if (keywords.length > 0) body.keywords = keywords;
  if (maxApplications !== null) body.maxApplications = maxApplications;

  return body;
}

function createScheduledRequest(body) {
  return new Request('https://scheduled.resume.local/api/auto-apply/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function isScheduledAutoApplyEnabled(env) {
  return String(env.CLIPROXY_AUTO_APPLY_ENABLED || '').trim().toLowerCase() !== 'false';
}

function readDryRun(env) {
  const value = String(env.CLIPROXY_AUTO_APPLY_DRY_RUN || '').trim().toLowerCase();
  if (value === 'false') return false;
  if (value === 'true') return true;
  return true;
}

function readKeywords(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return [];

  const parsed = parseKeywordJson(value);
  if (parsed.length > 0) return parsed;

  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

function parseKeywordJson(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((keyword) => typeof keyword === 'string')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

function readMaxApplications(value) {
  const maxApplications = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isInteger(maxApplications) || maxApplications < 1) return null;
  return maxApplications;
}

function createScheduledRunId(controller) {
  const scheduledTime =
    typeof controller.scheduledTime === 'number' ? controller.scheduledTime : Date.now();
  return `${SCHEDULED_RUN_ID_PREFIX}${scheduledTime}`;
}
