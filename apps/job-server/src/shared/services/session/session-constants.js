/**
 * Session constants — single source of truth for TTLs and supported platforms.
 *
 * Both SessionManager and SessionBrokerService read from here to avoid
 * duplicate TTL definitions drifting out of sync.
 */

/** Default session TTL when no platform-specific override exists. */
export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Platform-specific session TTLs (milliseconds). */
export const SESSION_PLATFORM_TTL_MS = Object.freeze({
  wanted: 24 * 60 * 60 * 1000,
  jobkorea: 30 * 24 * 60 * 60 * 1000,
  saramin: 7 * 24 * 60 * 60 * 1000,
  linkedin: 7 * 24 * 60 * 60 * 1000,
  remember: 30 * 24 * 60 * 60 * 1000,
});

/** All platforms that SessionManager tracks. */
export const SUPPORTED_SESSION_PLATFORMS = Object.freeze([
  'wanted',
  'saramin',
  'jobkorea',
  'remember',
  'linkedin',
]);

/** Platforms that the session broker can renew (subset of supported). */
export const RENEWABLE_SESSION_PLATFORMS = Object.freeze(['wanted']);

/**
 * Get the TTL for a given platform.
 * @param {string} platform
 * @returns {number}
 */
export function getSessionTtlMs(platform) {
  return SESSION_PLATFORM_TTL_MS[platform] || DEFAULT_SESSION_TTL_MS;
}
