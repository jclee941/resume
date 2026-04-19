import fs from 'fs';
import path from 'path';
import { CONFIG } from '../constants.js';
import { log } from '../utils.js';

export function loadJobKoreaSession() {
  const sessionPath = path.join(CONFIG.SESSION_DIR, 'jobkorea-session.json');
  if (!fs.existsSync(sessionPath)) {
    return null;
  }

  try {
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    if (Array.isArray(session?.cookies) && session.cookies.length > 0) {
      return session.cookies;
    }
    if (Array.isArray(session) && session.length > 0) {
      return session;
    }
    if (session?.cookieString && typeof session.cookieString === 'string') {
      const parsed = session.cookieString
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p && p.includes('='))
        .map((p) => {
          const [name, ...v] = p.split('=');
          return {
            name: name.trim(),
            value: v.join('=').trim(),
            domain: '.jobkorea.co.kr',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
          };
        });
      if (parsed.length > 0) return parsed;
    }
    return null;
  } catch (error) {
    log(`Failed to parse session file: ${error.message}`, 'error', 'jobkorea');
    return null;
  }
}

export function saveJobKoreaSession(cookies) {
  const sessionPath = path.join(CONFIG.SESSION_DIR, 'jobkorea-session.json');
  try {
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    let session = {};
    try {
      const existing = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      session = Array.isArray(existing)
        ? {}
        : existing && typeof existing === 'object'
          ? existing
          : {};
    } catch {
      // no existing session
    }
    session.cookies = cookies;
    session.cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    session.cookieCount = cookies.length;
    session.extractedAt = new Date().toISOString();
    if (!session.platform) session.platform = 'jobkorea';
    if (!session.expiresAt) {
      session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    log(`Session saved (${cookies.length} cookies)`, 'info', 'jobkorea');
  } catch (error) {
    log(`Failed to save session: ${error.message}`, 'error', 'jobkorea');
  }
}
