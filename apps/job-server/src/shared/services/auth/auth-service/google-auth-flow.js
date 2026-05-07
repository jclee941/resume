import { createSession, generateCsrfToken } from './token-store.js';

/**
 * Verify a Google OAuth credential and create an admin session.
 * @param {import('google-auth-library').OAuth2Client} googleClient
 * @param {import('./auth-typedefs.js').AuthConfig} config
 * @param {import('./auth-typedefs.js').SessionStore} store
 * @param {{error: Function}} logger
 * @param {string} credential
 * @returns {Promise<import('./auth-typedefs.js').GoogleAuthResult>}
 */
export async function verifyGoogleCredentialWithSession(
  googleClient,
  config,
  store,
  logger,
  credential
) {
  if (!credential) {
    return { success: false, error: 'Missing credential', statusCode: 400 };
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (error) {
    logger.error('Failed to verify Google ID token:', error);
    return { success: false, error: 'Invalid token', statusCode: 401 };
  }

  if (!payload?.email || payload.email !== config.adminEmail) {
    return { success: false, error: 'Access denied', statusCode: 403 };
  }

  const sessionId = createSession(store, payload.email, config.sessionTTL);
  const csrfToken = generateCsrfToken(store, sessionId);

  return {
    success: true,
    email: payload.email,
    sessionId,
    csrfToken,
  };
}
