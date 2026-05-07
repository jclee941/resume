import WantedAPI from '../../shared/clients/wanted/index.js';
import { buildUser, countCookies, hasProfileIdentity, sessionExpiry, toCookieString } from './cookie-utils.js';
import { SessionManager } from './session-manager.js';

const ACCOUNT_HINT = 'Use wanted_profile or wanted_resume to manage your account';

export async function handleSetCookies(cookies) {
  if (!cookies) {
    return missingCookiesResponse();
  }

  const cookieString = toCookieString(cookies);
  const api = new WantedAPI(cookieString);

  try {
    const profile = await api.getProfile();

    if (!hasProfileIdentity(profile)) {
      return {
        success: false,
        error: 'Cookies invalid - could not fetch profile',
        hint: 'Make sure you are logged in and copied the full Cookie header',
      };
    }

    SessionManager.save('wanted', {
      token: null,
      email: profile.email || 'unknown',
      cookies,
      cookieString,
      cookieCount: countCookies(cookieString, cookies),
      expiresAt: sessionExpiry(),
    });

    return {
      success: true,
      message: 'Cookies saved and validated',
      user: buildUser(profile),
      hint: ACCOUNT_HINT,
    };
  } catch (error) {
    return {
      success: false,
      error: `Cookie validation failed: ${error.message}`,
      hint: 'Cookies may be expired. Login again and get fresh cookies.',
    };
  }
}

export async function handleSetToken(token) {
  if (!token) {
    return missingTokenResponse();
  }

  const api = new WantedAPI(token);

  try {
    const profile = await api.getProfile();

    if (!hasProfileIdentity(profile)) {
      return {
        success: false,
        error: 'Token invalid - could not fetch profile',
        hint: 'Make sure you copied the correct token value',
      };
    }

    SessionManager.save('wanted', {
      token,
      email: profile.email || 'unknown',
      cookies: null,
      cookieString: null,
      cookieCount: 0,
      expiresAt: sessionExpiry(),
    });

    return {
      success: true,
      message: 'Token saved and validated',
      user: buildUser(profile),
      hint: ACCOUNT_HINT,
    };
  } catch (error) {
    return {
      success: false,
      error: `Token validation failed: ${error.message}`,
      hint: 'Token may be expired. Get a fresh token after logging in.',
    };
  }
}

export async function handleLogin(email, password) {
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

  const api = new WantedAPI();

  try {
    const loginResult = await api.auth.login(email, password);
    const profile = await api.getProfile();

    if (!hasProfileIdentity(profile)) {
      return {
        success: false,
        error: 'Login succeeded but could not fetch profile',
        hint: 'Session may be invalid. Try set_cookies instead.',
      };
    }

    const sessionToken = loginResult?.access_token || loginResult?.token || null;
    SessionManager.save('wanted', {
      token: sessionToken,
      email: profile.email || email,
      cookies: null,
      cookieString: null,
      cookieCount: 0,
      expiresAt: sessionExpiry(),
    });

    return {
      success: true,
      message: 'Login successful',
      user: buildUser(profile),
      hint: ACCOUNT_HINT,
    };
  } catch (error) {
    return {
      success: false,
      error: `Login failed: ${error.message}`,
      hint: 'Check your email/password or try set_cookies method instead',
    };
  }
}

function missingCookiesResponse() {
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

function missingTokenResponse() {
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
