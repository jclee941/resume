import SessionManager from '../../src/shared/services/session/session-manager.js';
import { sessionContentValidationMethods } from '../../src/shared/services/session/session-manager/session-content-validation.js';
import {
buildCookieString,
hasFreshSession,
legacyOpencodeSessionFile,
readJson,
repoSessionFile,
savePlatformSession,
} from './cookie-utils.js';

export const JOBKOREA_SESSION_PLATFORM = 'jobkorea';

const fallbackSessionFiles = [repoSessionFile, legacyOpencodeSessionFile];

function normalizeCookieStringSession(session) {
  if (!session?.cookieString || typeof session.cookieString !== 'string') {
    return [];
  }

  return session.cookieString
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && part.includes('='))
    .map((part) => {
      const [name, ...value] = part.split('=');
      return {
        name: name.trim(),
        value: value.join('=').trim(),
        domain: '.jobkorea.co.kr',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    });
}

export function getJobKoreaSessionCookies(session) {
  if (Array.isArray(session?.cookies) && session.cookies.length > 0) {
    return session.cookies;
  }
  if (Array.isArray(session) && session.length > 0) {
    return session;
  }
  return normalizeCookieStringSession(session);
}

function normalizeJobKoreaSession(session, source) {
  const cookies = getJobKoreaSessionCookies(session);
  if (!cookies.length) {
    return null;
  }

  const normalized = Array.isArray(session) ? {} : { ...session };
  normalized.platform = JOBKOREA_SESSION_PLATFORM;
  normalized.cookies = cookies;
  normalized.cookieString = normalized.cookieString || buildCookieString(cookies);
  normalized.cookieCount = normalized.cookieCount ?? cookies.length;
  Object.defineProperty(normalized, 'source', {
    value: source,
    enumerable: false,
    configurable: true,
  });
  return normalized;
}

export function resolveJobKoreaSession(options = {}) {
  const sessionManager = options.sessionManager || SessionManager;
  const saveResolvedFallback = options.saveResolvedFallback !== false;
  const requireFresh = options.requireFresh !== false;

  let managedSession = null;
  try {
    managedSession = normalizeJobKoreaSession(
      sessionManager.load(JOBKOREA_SESSION_PLATFORM),
      'session-manager'
    );
  } catch {
    managedSession = null;
  }
  if (managedSession && (!requireFresh || hasFreshSession(managedSession))) {
    const validation = sessionContentValidationMethods.validateSessionContent(
      JOBKOREA_SESSION_PLATFORM,
      managedSession
    );
if (validation.valid) {
return managedSession;
}
  }

  for (const filePath of options.fallbackFiles || fallbackSessionFiles) {
    const fileSession = normalizeJobKoreaSession(readJson(filePath), filePath);
if (!fileSession || (requireFresh && !hasFreshSession(fileSession))) {
continue;
    }

    const fileValidation = sessionContentValidationMethods.validateSessionContent(
      JOBKOREA_SESSION_PLATFORM,
      fileSession
    );
    if (!fileValidation.valid) {
      continue;
    }

    if (saveResolvedFallback) {
      try {
        sessionManager.save(JOBKOREA_SESSION_PLATFORM, fileSession);
      } catch {
        // File fallbacks remain usable even when SessionManager storage is unavailable.
      }
      savePlatformSession(fileSession, legacyOpencodeSessionFile);
    }
    return fileSession;
  }

  return null;
}

export function saveJobKoreaSession(session, options = {}) {
  const sessionManager = options.sessionManager || SessionManager;
  const normalized = normalizeJobKoreaSession(session, 'session-manager');
  if (!normalized) {
    return false;
  }

  let saved = false;
  try {
    saved = sessionManager.save(JOBKOREA_SESSION_PLATFORM, normalized);
  } catch {
    saved = false;
  }
  savePlatformSession(normalized, options.filePath || legacyOpencodeSessionFile);
  return saved;
}
