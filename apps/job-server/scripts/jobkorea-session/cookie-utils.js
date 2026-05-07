import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getSessionTtlMs } from '../../src/shared/services/session/session-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOBKOREA_PLATFORM = 'jobkorea';
export const jobKoreaSessionTtlMs = getSessionTtlMs(JOBKOREA_PLATFORM);

// repoSessionFile is a backward-compatible mirror at the project root.
const repoSessionFile = resolve(__dirname, '../../../../jobkorea-session.json');
const legacyOpencodeSessionFile = join(homedir(), '.opencode', 'data', 'sessions', 'jobkorea.json');
const defaultSessionFile = legacyOpencodeSessionFile;

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
  // Mirror to repo root for backward compatibility with older profile-sync runs.
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

export { defaultSessionFile, legacyOpencodeSessionFile, repoSessionFile };
