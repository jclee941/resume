import { SessionManager } from '../../session/index.js';

/**
 * Renew platform session through the existing CDP extraction script.
 * @param {string} platform
 * @returns {Promise<{success: boolean, message?: string, error?: string, expiresAt?: string}>}
 */
export async function renewSession(platform) {
  const currentSession = SessionManager.load(platform);

  if (!currentSession) {
    return {
      success: false,
      error: `No existing session for ${platform}`,
    };
  }

  const health = SessionManager.checkHealth(platform, 2 * 60 * 60 * 1000);

  if (health.valid && !health.expiringSoon) {
    return {
      success: true,
      message: `Session for ${platform} is still valid`,
      expiresAt: health.expiresAt,
    };
  }

  try {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const cdpScript = join(
      currentDir,
      '..',
      '..',
      '..',
      '..',
      '..',
      'scripts',
      'extract-cookies-cdp.js'
    );

    execSync(`node ${cdpScript} ${platform}`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000,
    });

    const newSession = SessionManager.load(platform);
    if (newSession && newSession.timestamp > Date.now() - 60000) {
      return {
        success: true,
        message: `Session renewed for ${platform}`,
        expiresAt: newSession.expiresAt,
      };
    }

    return {
      success: false,
      error: 'CDP extraction completed but session not updated',
    };
  } catch (error) {
    return {
      success: false,
      error: `Renewal failed: ${error.message}`,
    };
  }
}
