import { CONFIG, PLATFORMS } from './config.js';
import { log } from './logging.js';
import { isSessionExpired, loadSession, serializeCookies } from './session-persistence.js';

/**
 * @param {import('./session-persistence.js').StoredSession | null | undefined} session
 * @returns {Promise<boolean>}
 */
export async function syncToWorker(session) {
  if (!session?.cookies && !session?.cookieString) return false;

  log('Syncing to Worker...', 'info', session.platform);

  try {
    const response = await fetch(`${CONFIG.JOB_WORKER_URL}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Sync-Secret': CONFIG.AUTH_SYNC_SECRET || '',
      },
      body: JSON.stringify({
        platform: session.platform,
        cookies: session.cookieString || normalizeSessionCookies(session.cookies),
        expiresIn: 7 * 24 * 60 * 60 * 1000,
      }),
    });

    /** @type {{ success?: boolean; error?: string }} */
    const result = await response.json();

    if (response.ok && result.success) {
      log('Synced to Worker', 'success', session.platform);
      return true;
    }

    log(`Sync failed: ${result.error || response.status}`, 'error', session.platform);
    return false;
  } catch (error) {
    log(
      `Sync error: ${error instanceof Error ? error.message : String(error)}`,
      'error',
      session.platform
    );
    return false;
  }
}

export async function syncAllSessions() {
  log('Syncing all saved sessions to Worker...');

  for (const platformKey of Object.keys(PLATFORMS)) {
    try {
      const session = loadSession(platformKey);

      if (!session) {
        log('No saved session', 'warn', platformKey);
        continue;
      }

      if (isSessionExpired(session)) {
        log('Session expired', 'warn', platformKey);
        continue;
      }

      await syncToWorker(session);
    } catch (error) {
      log(
        `Failed to load session: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        platformKey
      );
    }
  }
}

/**
 * @param {Array<import('./session-persistence.js').SessionCookie> | string} cookies
 * @returns {string}
 */
function normalizeSessionCookies(cookies) {
  return Array.isArray(cookies) ? serializeCookies(cookies) : cookies;
}
