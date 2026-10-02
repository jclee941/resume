import { jsonResponse } from '../../middleware/cors.js';
import {
  HISTORY_PLATFORMS,
  syncApplicationHistory,
} from '../../services/application-history/sync.js';
import { fetchJobKoreaHistoryAfterLogin } from './jobkorea-history-login.js';

const ON_DEMAND_ADAPTERS = { jobkorea: fetchJobKoreaHistoryAfterLogin };

/**
 * @param {Request} request
 * @returns {Promise<{ platforms: import('../../services/application-history/history-types.js').HistoryPlatform[] } | { error: string }>}
 */
async function readPlatforms(request) {
  const text = (await request.text()).trim();
  if (!text) return { platforms: [...HISTORY_PLATFORMS] };
  /** @type {{ platforms?: unknown }} */
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON' };
  }
  const requested = body?.platforms ?? [...HISTORY_PLATFORMS];
  const valid =
    Array.isArray(requested) &&
    requested.length > 0 &&
    requested.every((platform) => HISTORY_PLATFORMS.includes(platform));
  return valid
    ? { platforms: [...new Set(/** @type {typeof HISTORY_PLATFORMS[number][]} */ (requested))] }
    : { error: `platforms must be a non-empty subset of ${HISTORY_PLATFORMS.join(', ')}` };
}

/**
 * POST /api/applications/sync: pulls the owner's application history from Wanted and JobKorea
 * into D1 `applications`. Answers 502 only when every requested platform failed.
 * @param {Parameters<typeof syncApplicationHistory>[0]} env
 * @param {Request} request
 * @param {typeof syncApplicationHistory} [sync]
 * @returns {Promise<Response>}
 */
export async function handleApplicationHistorySync(env, request, sync = syncApplicationHistory) {
  const parsed = await readPlatforms(request);
  if ('error' in parsed) return jsonResponse({ error: parsed.error }, 400);
  const summary = await sync(env, { platforms: parsed.platforms, adapters: ON_DEMAND_ADAPTERS });
  return jsonResponse(summary, summary.status === 'failed' ? 502 : 200);
}
