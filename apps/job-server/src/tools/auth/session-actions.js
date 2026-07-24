import { SessionManager } from '../../shared/services/session/index.js';

export function handleStatus() {
  const session = SessionManager.load('wanted');

  if (session && (session.token || session.cookies || session.cookieString)) {
    const expiresIn = Math.round((24 * 60 * 60 * 1000 - (Date.now() - session.timestamp)) / 60000);

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

export function handleLogout() {
  SessionManager.clear('wanted');

  return {
    success: true,
    message: 'Session cleared successfully',
  };
}
