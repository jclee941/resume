import { log } from '../sync-logger.js';
import {
  getJobKoreaSessionCookies,
  resolveJobKoreaSession,
  saveJobKoreaSession as saveResolvedJobKoreaSession,
} from '../../jobkorea-session/jobkorea-session-resolver.js';
import { buildCookieString, jobKoreaSessionTtlMs } from '../../jobkorea-session/cookie-utils.js';
import { handleCaptchaIfNeeded } from '../../jobkorea-session/captcha-handler.js';

export const JOBKOREA_SESSION_RENEW_PATH =
  'node apps/job-server/scripts/renew-jobkorea-session.js with HEADLESS=false';

const JOBKOREA_VERIFICATION_TEXT_RE = /보안인증|reCAPTCHA|자동가입 방지|비정상적인 접근/i;
const JOBKOREA_VERIFICATION_IFRAME_RE =
  /<iframe\b[^>]*src=["'][^"']*(captcha|recaptcha)[^"']*["']/i;

function createJobKoreaVerificationError(reason) {
  const reasonText = reason ? ` Automatic solve failed: ${reason}.` : '';
  const error = new Error(
    `JobKorea CAPTCHA/2FA required.${reasonText} Regenerate session via: ${JOBKOREA_SESSION_RENEW_PATH}`
  );
  error.failLoud = true;
  return error;
}

export async function assertJobKoreaResumeAccess(page, options = {}) {
  const logger = options.logger ?? log;
  const headlessEnv = options.headlessEnv ?? String(process.env.HEADLESS !== 'false');
  const currentUrl = typeof page?.url === 'function' ? page.url() : '';
  if (/\/Login/i.test(currentUrl)) {
    throw createJobKoreaVerificationError();
  }

  const html = await page.content();
  if (JOBKOREA_VERIFICATION_TEXT_RE.test(html) || JOBKOREA_VERIFICATION_IFRAME_RE.test(html)) {
    try {
      const handled = await handleCaptchaIfNeeded(page, { log: logger, headlessEnv });
      if (handled) {
        return;
      }
    } catch (error) {
      throw createJobKoreaVerificationError(error.message);
    }

    throw createJobKoreaVerificationError();
  }
}

export function loadJobKoreaSession() {
  const resolvedSession = resolveJobKoreaSession();
  return resolvedSession ? getJobKoreaSessionCookies(resolvedSession) : null;
}

export function saveJobKoreaSession(cookies) {
  try {
    let session = {};
    try {
      const existing = resolveJobKoreaSession({ saveResolvedFallback: false, requireFresh: false });
      session = Array.isArray(existing)
        ? {}
        : existing && typeof existing === 'object'
          ? existing
          : {};
    } catch {
      // no existing session
    }
    session.cookies = cookies;
    session.cookieString = buildCookieString(cookies);
    session.cookieCount = cookies.length;
    session.extractedAt = new Date().toISOString();
    if (!session.platform) session.platform = 'jobkorea';
    if (!session.expiresAt) {
      session.expiresAt = new Date(Date.now() + jobKoreaSessionTtlMs).toISOString();
    }
    saveResolvedJobKoreaSession(session);
    log(`Session saved (${cookies.length} cookies)`, 'info', 'jobkorea');
  } catch (error) {
    log(`Failed to save session: ${error.message}`, 'error', 'jobkorea');
  }
}
