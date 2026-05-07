import { SUPPORTED_SESSION_PLATFORMS, getSessionTtlMs } from '../session-constants.js';

function getSessionExpiresAt(session, platform) {
  if (!session?.timestamp) return null;
  return new Date(session.timestamp + getSessionTtlMs(platform));
}

function isTimestampValid(session, platform, now = Date.now()) {
  return Boolean(session?.timestamp && now - session.timestamp < getSessionTtlMs(platform));
}

export const sessionExpirationMethods = {
  getStatus() {
    const sessions = this.load() || {};

    return SUPPORTED_SESSION_PLATFORMS.map((platform) => {
      const session = sessions[platform];
      const expiresAt = getSessionExpiresAt(session, platform);

      return {
        platform,
        authenticated: isTimestampValid(session, platform),
        email: session?.email || null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        lastUpdated: session?.timestamp ? new Date(session.timestamp).toISOString() : null,
      };
    });
  },

  checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000, validateContent = false) {
    const session = this.load(platform);
    if (!session || !session.timestamp) {
      return { valid: false, expiringSoon: false, expiresAt: null, reason: 'no_session' };
    }

    const expiresAt = getSessionExpiresAt(session, platform);
    const remaining = expiresAt.getTime() - Date.now();
    const timestampValid = remaining > 0;

    if (validateContent && timestampValid) {
      const contentValidation = this.validateSessionContent(platform, session);
      if (!contentValidation.valid) {
        return {
          valid: false,
          expiringSoon: false,
          expiresAt,
          reason: contentValidation.reason,
        };
      }
    }

    return {
      valid: timestampValid,
      expiringSoon: timestampValid && remaining < thresholdMs,
      expiresAt,
    };
  },

  isRenewalNeeded(platform, threshold = 0.8) {
    const session = this.load(platform);
    if (!session || !session.timestamp || !session.expiresAt) {
      return true;
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    const totalLifetime = expiresAt - session.timestamp;
    const elapsed = now - session.timestamp;

    return elapsed >= totalLifetime * threshold;
  },

  getSessionStatus(platform) {
    const session = this.load(platform);

    if (!session) {
      return { exists: false, valid: false, needsRenewal: true, session: null };
    }

    return {
      exists: true,
      valid: isTimestampValid(session, platform),
      needsRenewal: this.isRenewalNeeded(platform),
      session,
    };
  },
};
