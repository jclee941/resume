import { SessionManager } from '../../src/shared/services/session/index.js';

export function checkSession(platform) {
  const session = SessionManager.load(platform);
  if (!session) return { valid: false, reason: 'no session' };
  if (!session || !session.timestamp || Date.now() - session.timestamp > 24 * 60 * 60 * 1000)
    return { valid: false, reason: 'expired' };

  const cookieArr = Array.isArray(session.cookies) ? session.cookies : [];
  const cookieStr = session.cookieString || (typeof session.cookies === 'string' ? session.cookies : '');

  const hasAuth = cookieArr.length > 0
    ? cookieArr.some((c) => c.name.includes('TOKEN') || c.name.includes('session') || c.name.includes('auth'))
    : /TOKEN|session|auth/i.test(cookieStr);
  if (!hasAuth) return { valid: false, reason: 'no auth cookie' };

  return { valid: true, cookies: session.cookieCount || cookieArr.length || cookieStr.split(';').filter(Boolean).length };
}

export { SessionManager };
