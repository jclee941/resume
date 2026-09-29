import { normalizeError } from '@resume/shared/errors';
import {
  platformSessionKey,
  readPlatformSession,
  writePlatformSession,
} from '../services/platform-session.js';

const SESSION_KEY_PREFIX = platformSessionKey('');
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ email?: string | null; updatedAt?: string }} SessionMetadata
 *
 * @typedef {{
 *   get(key: string): Promise<string | null>;
 *   put(
 *     key: string,
 *     value: string,
 *     options?: { expirationTtl?: number; metadata?: SessionMetadata }
 *   ): Promise<void>;
 *   delete(key: string): Promise<void>;
 *   list(options: { prefix: string }): Promise<{
 *     keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
 *   }>;
 * }} SessionKv
 *
 * @typedef {{
 *   ENCRYPTION_KEY?: string;
 *   SESSIONS: SessionKv;
 *   [key: string]: unknown;
 * }} AuthEnv
 */

/**
 * Platform login sessions. The only store is KV `auth:<platform>`, written
 * and read through services/platform-session.js (AES-GCM at rest).
 */
export class AuthHandler {
  /**
   * @param {AuthEnv} env
   */
  constructor(env) {
    this.env = env;
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * A platform counts as authenticated only while its stored session decrypts.
   * @param {Request} [_request]
   * @returns {Promise<Response>}
   */
  async getStatus(_request) {
    const { keys } = await this.env.SESSIONS.list({ prefix: SESSION_KEY_PREFIX });

    /** @type {Record<string, { authenticated: boolean; email: string | null; expiresAt: string | null; updatedAt: string | null }>} */
    const status = {};
    for (const key of keys) {
      const platform = key.name.slice(SESSION_KEY_PREFIX.length);
      const metadata = /** @type {SessionMetadata | undefined} */ (key.metadata);
      status[platform] = {
        authenticated: (await readPlatformSession(this.env, platform)) !== null,
        email: metadata?.email ?? null,
        expiresAt: key.expiration ? new Date(key.expiration * 1000).toISOString() : null,
        updatedAt: metadata?.updatedAt ?? null,
      };
    }

    return this.jsonResponse({ success: true, status });
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async setAuth(request) {
    const body = await request.json();
    const { platform, cookies, email } = body;

    if (!platform || !cookies) {
      return this.jsonResponse({ error: 'Platform and cookies required' }, 400);
    }

    await writePlatformSession(this.env, platform, cookies, DEFAULT_SESSION_TTL_MS / 1000, {
      email: email || null,
    });

    return this.jsonResponse({
      success: true,
      message: `Auth saved for ${platform}`,
    });
  }

  /**
   * @param {import('../router.js').RouterRequest} request
   * @returns {Promise<Response>}
   */
  async clearAuth(request) {
    const { platform } = request.params;

    await this.env.SESSIONS.delete(platformSessionKey(platform));

    return this.jsonResponse({
      success: true,
      message: `Logged out from ${platform}`,
    });
  }

  /**
   * @param {string} platform
   * @returns {Promise<string | null>}
   */
  async getCookies(platform) {
    return readPlatformSession(this.env, platform);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async getProfile(request) {
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') || 'wanted';

    if (platform !== 'wanted') {
      return this.jsonResponse(
        {
          error: 'Profile check only supported for Wanted',
          hint: 'LinkedIn and Remember use public APIs without auth',
        },
        400
      );
    }

    const cookies = await this.getCookies(platform);
    if (!cookies) {
      return this.jsonResponse(
        {
          authenticated: false,
          error: 'No session found',
          hint: 'Set session via POST /api/auth/set with platform=wanted and cookies=...',
        },
        401
      );
    }

    try {
      const response = await fetch('https://www.wanted.co.kr/api/v4/users/status', {
        headers: {
          Accept: 'application/json',
          Cookie: cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return this.jsonResponse(
          {
            authenticated: false,
            error: `Wanted returned ${response.status}`,
            hint: 'Session may be expired. Re-authenticate.',
          },
          401
        );
      }

      const data = await response.json();
      return this.jsonResponse({
        authenticated: true,
        platform: 'wanted',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.name,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'AuthHandler',
        action: 'getProfile',
        platform: 'wanted',
      });
      console.error('Profile check failed:', normalized);
      return this.jsonResponse(
        {
          authenticated: false,
          error: normalized.message,
        },
        500
      );
    }
  }
}
