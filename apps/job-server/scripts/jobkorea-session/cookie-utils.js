import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

const defaultSessionFile = join(homedir(), '.OpenCode', 'data', 'jobkorea-session.json');

export function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function buildCookieString(cookies = []) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

export function hasFreshSession(session) {
  if (!session || !session.expiresAt) {
    return false;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  const hasCookies =
    (Array.isArray(session.cookies) && session.cookies.length > 0) ||
    (typeof session.cookieString === 'string' && session.cookieString.length > 0);

  return Number.isFinite(expiresAt) && expiresAt > Date.now() && hasCookies;
}

export function ensureSessionDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function savePlatformSession(data, filePath = defaultSessionFile) {
  ensureSessionDir(filePath);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export { defaultSessionFile };
