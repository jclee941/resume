import SessionManager from '../../src/shared/services/session/session-manager.js';
import {
  buildCookieString,
  hasFreshSession,
  readJson,
  savePlatformSession,
} from './cookie-utils.js';

export async function maybeUseExistingSession({
  sessionFile,
  email,
  verifyAuthenticatedSession,
  resumeUrl,
  userAgent,
  log,
}) {
  const existingFileSession = readJson(sessionFile);
  if (hasFreshSession(existingFileSession)) {
    const cookieString =
      existingFileSession.cookieString ||
      buildCookieString(Array.isArray(existingFileSession.cookies) ? existingFileSession.cookies : []);

    await verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent });
    log(
      `Existing session is still valid (${existingFileSession.cookieCount || 0} cookies, expires ${existingFileSession.expiresAt})`
    );
    return true;
  }

  const unifiedSession = SessionManager.load('jobkorea');
  if (
    hasFreshSession(unifiedSession) &&
    SessionManager.validateSessionContent('jobkorea', unifiedSession).valid
  ) {
    const cookieString =
      unifiedSession.cookieString || buildCookieString(unifiedSession.cookies || []);
    await verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent });

    const mirrored = {
      ...unifiedSession,
      platform: 'jobkorea',
      email,
      cookies: Array.isArray(unifiedSession.cookies) ? unifiedSession.cookies : [],
      cookieString,
      cookieCount: unifiedSession.cookieCount ?? (unifiedSession.cookies || []).length,
    };
    savePlatformSession(mirrored, sessionFile);
    log(
      `Unified session is still valid (${mirrored.cookieCount} cookies, expires ${mirrored.expiresAt})`
    );
    return true;
  }

  return false;
}
