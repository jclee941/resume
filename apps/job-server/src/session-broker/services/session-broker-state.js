import { normalizePlatform, SESSION_STATES } from './session-broker-constants.js';

/**
 * @typedef {{
 *   state?: string,
 *   lastError?: string | null,
 *   expiresAt?: string | number | null,
 *   renewedAt?: string | number | null,
 *   [key: string]: unknown,
 * }} SessionStateEntry
 *
 * @typedef {{
 *   stateStore: {
 *     get(key: string): SessionStateEntry | undefined,
 *     set(key: string, value: SessionStateEntry): unknown,
 *   }
 * }} StateStoreHolder
 */

/**
 * @param {StateStoreHolder} service
 * @param {string} platform
 * @returns {string}
 */
export function getState(service, platform) {
  const normalized = normalizePlatform(platform);
  const entry = service.stateStore.get(normalized);
  return entry?.state ?? SESSION_STATES.EXPIRED;
}

/**
 * @param {StateStoreHolder} service
 * @param {string} platform
 * @returns {SessionStateEntry | null}
 */
export function getStateEntry(service, platform) {
  const normalized = normalizePlatform(platform);
  return service.stateStore.get(normalized) ?? null;
}

/**
 * @param {StateStoreHolder} service
 * @param {string} platform
 * @param {string | Partial<SessionStateEntry>} [stateOrEntry]
 * @returns {void}
 */
export function setState(service, platform, stateOrEntry) {
  const normalized = normalizePlatform(platform);
  const existing = service.stateStore.get(normalized) ?? {};
  const patch = typeof stateOrEntry === 'string' ? { state: stateOrEntry } : (stateOrEntry ?? {});
  service.stateStore.set(normalized, { ...existing, ...patch });
}
