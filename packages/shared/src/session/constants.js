/** Default session TTL when no platform-specific override exists. */
export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Platform-specific session TTLs in milliseconds. */
export const SESSION_PLATFORM_TTL_MS = Object.freeze({
  wanted: 24 * 60 * 60 * 1000,
  jobkorea: 7 * 24 * 60 * 60 * 1000,
  saramin: 7 * 24 * 60 * 60 * 1000,
  linkedin: 7 * 24 * 60 * 60 * 1000,
  remember: 30 * 24 * 60 * 60 * 1000,
});

/** All platforms tracked by job automation session stores. */
export const SUPPORTED_SESSION_PLATFORMS = Object.freeze([
  'wanted',
  'saramin',
  'jobkorea',
  'remember',
  'linkedin',
]);

/** Platforms that the session broker can renew. */
export const RENEWABLE_SESSION_PLATFORMS = Object.freeze(['wanted']);

/** Dashboard admin session token TTL in milliseconds. */
export const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Resolve a platform TTL without changing legacy fallback behavior.
 * @param {string} platform
 * @returns {number}
 */
export function getSessionTtlMs(platform) {
  return SESSION_PLATFORM_TTL_MS[platform] || DEFAULT_SESSION_TTL_MS;
}

/** @param {number} ttlMs @param {number} now */
export function calculateExpiresAt(ttlMs, now = Date.now()) {
  return new Date(now + ttlMs).toISOString();
}

/** @param {number|string|Date} expiresAt @param {number} now */
export function isSessionExpired(expiresAt, now = Date.now()) {
  const expiryMs = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return !Number.isFinite(expiryMs) || expiryMs <= now;
}
