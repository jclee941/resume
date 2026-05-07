/**
 * Wanted Korea authentication MCP tool definition.
 */

import { executeAuthAction } from './handlers.js';

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

  execute: executeAuthAction,
};

export default authTool;
