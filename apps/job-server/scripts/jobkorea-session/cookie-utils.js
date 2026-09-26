import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

/**
 * @typedef {{
 *   name: string;
 *   value?: unknown;
 * }} CookieKeyValue
 *
 * @typedef {{
 *   name?: string | null;
 *   value?: unknown;
 *   domain?: string | null;
 *   path?: string | null;
 *   httpOnly?: boolean | null;
 *   secure?: boolean | null;
 *   sameSite?: string | null;
 *   expires?: number | null;
 * }} RawCookie
 *
 * @typedef {{
 *   name: string;
 *   value: string;
 *   domain: string;
 *   path: string;
 *   httpOnly: boolean;
 *   secure: boolean;
 *   sameSite: 'Lax' | 'Strict' | 'None';
 *   expires: number;
 * }} PlaywrightCookie
 *
 * @typedef {{
 *   expiresAt?: string | number | Date | null;
 *   cookies?: unknown[] | null;
 *   cookieString?: string | null;
 *   [key: string]: unknown;
 * }} SessionInput
 *
 * @typedef {{
 *   mirrorRepo?: boolean;
 * }} SavePlatformSessionOptions
 */

/**
 * @param {string} filePath
 * @returns {unknown}
 */
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

/**
 * @param {CookieKeyValue[]} [cookies]
 * @returns {string}
 */
export function buildCookieString(cookies = []) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

const PLAYWRIGHT_SAME_SITE = new Set(['Lax', 'Strict', 'None']);

/**
 * @param {RawCookie[] | null | undefined} cookies
 * @returns {PlaywrightCookie[]}
 */
export function toPlaywrightCookies(cookies) {
  if (!Array.isArray(cookies)) {
    return [];
  }
  return cookies
    .filter(
      (cookie) => cookie && cookie.name && cookie.value !== undefined && cookie.value !== null
    )
    .map((cookie) => ({
      name: /** @type {string} */ (cookie.name),
      value: String(cookie.value),
      domain: cookie.domain || '.jobkorea.co.kr',
      path: cookie.path || '/',
      httpOnly: !!cookie.httpOnly,
      secure: !!cookie.secure,
      sameSite: PLAYWRIGHT_SAME_SITE.has(/** @type {string} */ (cookie.sameSite))
        ? /** @type {'Lax' | 'Strict' | 'None'} */ (cookie.sameSite)
        : 'Lax',
      expires: typeof cookie.expires === 'number' ? cookie.expires : -1,
    }));
}

/**
 * @param {SessionInput | null | undefined} session
 * @returns {boolean}
 */
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

/**
 * @param {string} filePath
 * @returns {void}
 */
export function ensureSessionDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * @param {string} filePath
 * @param {unknown} data
 * @returns {void}
 */
function writePrivateSessionFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(filePath, 0o600);
}

/**
 * @param {unknown} data
 * @param {string} [filePath]
 * @param {SavePlatformSessionOptions} [options]
 * @returns {void}
 */
export function savePlatformSession(data, filePath = defaultSessionFile, options = {}) {
  const mirrorRepo = options.mirrorRepo !== false;
  ensureSessionDir(filePath);
  writePrivateSessionFile(filePath, data);
  // Mirror to repo root for backward compatibility with older profile-sync runs.
  if (mirrorRepo && filePath !== repoSessionFile) {
    try {
      ensureSessionDir(repoSessionFile);
      writePrivateSessionFile(repoSessionFile, data);
    } catch (error) {
      // non-fatal: profile-sync will warn separately if missing
      console.warn(
        `[jobkorea-session] mirror to repo failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export { defaultSessionFile, legacyOpencodeSessionFile, repoSessionFile };
