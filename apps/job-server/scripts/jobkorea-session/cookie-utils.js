import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// repoSessionFile is the location profile-sync/constants.js reads from (repo root).
const repoSessionFile = resolve(__dirname, '../../../../jobkorea-session.json');


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
  // Also mirror to repo root so profile-sync (CONFIG.SESSION_DIR) sees the same data.
  if (filePath !== repoSessionFile) {
    try {
      ensureSessionDir(repoSessionFile);
      writeFileSync(repoSessionFile, JSON.stringify(data, null, 2));
    } catch (error) {
      // non-fatal: profile-sync will warn separately if missing
      console.warn(`[jobkorea-session] mirror to repo failed: ${error.message}`);
    }
  }
}


export { defaultSessionFile, repoSessionFile };
