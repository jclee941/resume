import { encrypt, decrypt } from '../utils/crypto.js';
import { normalizeError } from '../../../src/shared/errors/index.js';

export class AuthHandler {
  constructor(db, kv, env) {
    this.db = db;
    this.kv = kv;
    this.env = env;
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getStatus(_request) {
    const sessions = await this.db
      .prepare('SELECT platform, email, expires_at, updated_at FROM sessions')
      .all();

    const status = {};
    for (const session of sessions.results) {
      const isExpired = session.expires_at && new Date(session.expires_at) < new Date();
      status[session.platform] = {
        authenticated: !isExpired,
        email: session.email,
        expiresAt: session.expires_at,
        updatedAt: session.updated_at,
      };
    }

    return this.jsonResponse({ success: true, status });
  }

  async setAuth(request) {
    const body = await request.json();
    const { platform, cookies, email } = body;

    if (!platform || !cookies) {
      return this.jsonResponse({ error: 'Platform and cookies required' }, 400);
    }

    const encryptedCookies = await encrypt(cookies, this.env);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare(
        `
      INSERT OR REPLACE INTO sessions (platform, cookies, email, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .bind(platform, encryptedCookies, email || null, expiresAt, now, now)
      .run();

    if (this.kv) {
      await this.kv.put(`session:${platform}`, encryptedCookies, {
        expirationTtl: 86400,
      });
    }

    return this.jsonResponse({
      success: true,
      message: `Auth saved for ${platform}`,
    });
  }

  async clearAuth(request) {
    const { platform } = request.params;

    await this.db.prepare('DELETE FROM sessions WHERE platform = ?').bind(platform).run();

    if (this.kv) {
      await this.kv.delete(`session:${platform}`);
    }

    return this.jsonResponse({
      success: true,
      message: `Logged out from ${platform}`,
    });
  }

  async getCookies(platform) {
    const result = await this.db
      .prepare('SELECT cookies, expires_at FROM sessions WHERE platform = ?')
      .bind(platform)
      .first();

    if (!result) return null;

    const isExpired = result.expires_at && new Date(result.expires_at) < new Date();
    if (isExpired) return null;

    return decrypt(result.cookies, this.env);
  }

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

  /**
   * Sync auth from external script (auth-sync.js)
   * Requires X-Auth-Sync-Secret header matching AUTH_SYNC_SECRET env var
   */
  async syncFromScript(request) {
    // Verify secret
    const secret = request.headers.get('X-Auth-Sync-Secret');
    if (!secret || secret !== this.env.AUTH_SYNC_SECRET) {
      return this.jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await request.json();
    const { platform, cookies, email, expiresIn } = body;

    if (!platform || !cookies) {
      return this.jsonResponse({ error: 'Platform and cookies required' }, 400);
    }

    // Validate platform
    const allowedPlatforms = ['wanted', 'saramin', 'jobkorea', 'linkedin'];
    if (!allowedPlatforms.includes(platform)) {
      return this.jsonResponse({ error: `Invalid platform: ${platform}` }, 400);
    }

    // Encrypt and store
    const encryptedCookies = await encrypt(cookies, this.env);
    const now = new Date().toISOString();
    const ttl = expiresIn || 24 * 60 * 60 * 1000; // Default 24h
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    await this.db
      .prepare(
        `
      INSERT OR REPLACE INTO sessions (platform, cookies, email, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .bind(platform, encryptedCookies, email || null, expiresAt, now, now)
      .run();

    // Also store in KV for faster access
    if (this.kv) {
      await this.kv.put(`session:${platform}`, encryptedCookies, {
        expirationTtl: Math.floor(ttl / 1000),
      });
    }

    return this.jsonResponse({
      success: true,
      message: `Auth synced for ${platform}`,
      expiresAt,
    });
  }
}
