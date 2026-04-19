export const DEFAULT_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_TTL_THRESHOLD = 0.8;
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_MS = 30_000;

export const SESSION_STATES = Object.freeze({
  VALID: 'VALID',
  VALIDATING: 'VALIDATING',
  RENEW_NEEDED: 'RENEW_NEEDED',
  RENEWING: 'RENEWING',
  EXPIRED: 'EXPIRED',
});

export const SUPPORTED_SESSION_BROKER_PLATFORMS = Object.freeze(['wanted']);

export function normalizePlatform(platform) {
  if (typeof platform !== 'string' || platform.trim().length === 0) {
    throw new TypeError('platform must be a non-empty string');
  }

  return platform.trim().toLowerCase();
}

export function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
