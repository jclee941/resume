/**
 * MCP Tool: Authentication
 * Handles login and session management for Wanted Korea
 *
 * Note: Wanted blocks automated browsers (CloudFront WAF)
 * Users must login manually and provide cookies
 */

import WantedAPI from '../shared/clients/wanted/index.js';
import { SessionManager } from '../shared/services/session/index.js';

// Re-export for tests
export { SessionManager };
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const authTool = {
  name: 'wanted_auth',
  description: `Manage authentication for Wanted Korea (원티드 인증).

⚠️ Wanted blocks automated browsers. Manual cookie extraction required.

Actions:
- set_cookies: Set auth cookies from browser (recommended)
- set_token: Set JWT token directly
- status: Check current login status
- logout: Clear saved session

How to get cookies:
1. Login to www.wanted.co.kr in your browser
2. Open DevTools (F12) → Network tab
3. Refresh page and click any API request to www.wanted.co.kr/api/*
4. Copy the Cookie header value
5. Use: wanted_auth({ action: "set_cookies", cookies: "cookie_string_here" })

Alternative - JWT Token:
1. In DevTools → Application → Local Storage
2. Find 'wanted_access_token' or similar
3. Use: wanted_auth({ action: "set_token", token: "jwt_token_here" })

Session stored in: job-automation-mcp/.data/wanted-session.json (24hr expiry)`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['set_cookies', 'set_token', 'status', 'logout'],
        description: 'Authentication action',
      },
      cookies: {
        type: 'string',
        description: 'Cookie header string from browser (for set_cookies)',
      },
      token: {
        type: 'string',
        description: 'JWT auth token (for set_token)',
      },
    },
    required: ['action'],
  },

  async execute(params) {
    const { action, token, cookies } = params;

    switch (action) {
      case 'set_cookies': {
        if (!cookies) {
          return {
            success: false,
            error: 'Cookies string is required',
            instructions: [
              '1. Login to www.wanted.co.kr in browser',
              '2. Open DevTools (F12) → Network tab',
              '3. Refresh and click any API request',
              '4. Copy the Cookie header value',
              '5. Paste it here as the cookies parameter',
            ],
          };
        }

        // Test cookies by making API request
        const api = new WantedAPI({ cookies });
        try {
          const profile = await api.getProfile();

          if (profile && (profile.id || profile.email || profile.name)) {
            SessionManager.save(null, profile.email || 'unknown', cookies);
            return {
              success: true,
              message: 'Cookies saved and validated',
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name,
              },
              hint: 'Use wanted_profile or wanted_resume to manage your account',
            };
          } else {
            return {
              success: false,
              error: 'Cookies invalid - could not fetch profile',
              hint: 'Make sure you are logged in and copied the full Cookie header',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `Cookie validation failed: ${error.message}`,
            hint: 'Cookies may be expired. Login again and get fresh cookies.',
          };
        }
      }

      case 'set_token': {
        if (!token) {
          return {
            success: false,
            error: 'Token is required',
            instructions: [
              '1. Login to www.wanted.co.kr in browser',
              '2. Open DevTools → Application → Local Storage',
              '3. Find wanted_access_token or similar',
              '4. Copy the token value',
              '5. Paste it here as the token parameter',
            ],
          };
        }

        // Validate token
        const api = new WantedAPI({ token });
        try {
          const profile = await api.getProfile();

          if (profile && (profile.id || profile.email || profile.name)) {
            SessionManager.save(token, profile.email || 'unknown');
            return {
              success: true,
              message: 'Token saved and validated',
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name,
              },
              hint: 'Use wanted_profile or wanted_resume to manage your account',
            };
          } else {
            return {
              success: false,
              error: 'Token invalid - could not fetch profile',
              hint: 'Make sure you copied the correct token value',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `Token validation failed: ${error.message}`,
            hint: 'Token may be expired. Get a fresh token after logging in.',
          };
        }
      }

      case 'status': {
        const session = SessionManager.load();
        if (session && (session.token || session.cookies)) {
          const expiresIn = Math.round(
            (24 * 60 * 60 * 1000 - (Date.now() - session.timestamp)) / 60000
          );
          return {
            success: true,
            logged_in: true,
            email: session.email,
            auth_type: session.token ? 'token' : 'cookies',
            expires_in_minutes: expiresIn,
            hint: 'Use wanted_profile to view your profile, wanted_resume to update resume',
          };
        }
        return {
          success: true,
          logged_in: false,
          message: 'Not logged in',
          hint: 'Use action="set_cookies" with Cookie header from browser after logging in',
        };
      }

      case 'logout': {
        SessionManager.clear();
        return {
          success: true,
          message: 'Session cleared successfully',
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['set_cookies', 'set_token', 'status', 'logout'],
        };
    }
  },
};

// Export session manager for other tools
export default authTool;
