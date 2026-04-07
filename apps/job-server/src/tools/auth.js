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
- login: Login with email/password (via Wanted API)
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

Alternative - Email/Password Login:
1. Use: wanted_auth({ action: "login", email: "user@example.com", password: "password" })

Session stored in: <repo-root>/sessions.json (24hr expiry)`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['set_cookies', 'set_token', 'login', 'status', 'logout'],
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
      email: {
        type: 'string',
        description: 'Email address (for login)',
      },
      password: {
        type: 'string',
        description: 'Password (for login)',
      },
    },
    required: ['action'],
  },

  async execute(params) {
    const { action, token, cookies, email, password } = params;

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
        const cookieStr =
          typeof cookies === 'string'
            ? cookies
            : Array.isArray(cookies)
              ? cookies.map((c) => `${c.name}=${c.value}`).join('; ')
              : String(cookies);
        const api = new WantedAPI(cookieStr);
        try {
          const profile = await api.getProfile();

          if (profile && (profile.id || profile.email || profile.name)) {
            const cookieString =
              typeof cookies === 'string'
                ? cookies
                : Array.isArray(cookies)
                  ? cookies.map((c) => `${c.name}=${c.value}`).join('; ')
                  : String(cookies);
            SessionManager.save('wanted', {
              token: null,
              email: profile.email || 'unknown',
              cookies,
              cookieString,
              cookieCount: Array.isArray(cookies)
                ? cookies.length
                : cookieString.split(';').filter(Boolean).length,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
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
        const api = new WantedAPI(token);
        try {
          const profile = await api.getProfile();

          if (profile && (profile.id || profile.email || profile.name)) {
            SessionManager.save('wanted', {
              token,
              email: profile.email || 'unknown',
              cookies: null,
              cookieString: null,
              cookieCount: 0,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
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

      case 'login': {
        if (!email || !password) {
          return {
            success: false,
            error: 'Email and password are required',
            instructions: [
              '1. Provide email and password parameters',
              '2. Example: wanted_auth({ action: "login", email: "user@example.com", password: "password" })',
            ],
          };
        }

        // Login via Wanted API
        const api = new WantedAPI();
        try {
          const loginResult = await api.auth.login(email, password);

          // After login, validate by getting profile
          const profile = await api.getProfile();

          if (profile && (profile.id || profile.email || profile.name)) {
            // Extract token from login result if available
            const sessionToken = loginResult?.access_token || loginResult?.token || null;
            const userEmail = profile.email || email;

            SessionManager.save('wanted', {
              token: sessionToken,
              email: userEmail,
              cookies: null,
              cookieString: null,
              cookieCount: 0,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });

            return {
              success: true,
              message: 'Login successful',
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
              error: 'Login succeeded but could not fetch profile',
              hint: 'Session may be invalid. Try set_cookies instead.',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `Login failed: ${error.message}`,
            hint: 'Check your email/password or try set_cookies method instead',
          };
        }
      }

      case 'status': {
        const session = SessionManager.load('wanted');
        if (session && (session.token || session.cookies || session.cookieString)) {
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
        SessionManager.clear('wanted');
        return {
          success: true,
          message: 'Session cleared successfully',
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['set_cookies', 'set_token', 'login', 'status', 'logout'],
        };
    }
  },
};

// Export session manager for other tools
export default authTool;
