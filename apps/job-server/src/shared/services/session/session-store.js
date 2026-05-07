/**
 * SessionStore port — contract for session persistence adapters.
 *
 * Implementations:
 * - {@link SessionManager} — file-based production store
 * - In-memory test adapters (see session-broker tests)
 *
 * The broker and services depend on this contract, not on concrete
 * implementations, so stores can be swapped without changing consumer code.
 */

/**
 * @typedef {Object} SessionStore
 * @property {(platform?: string|null) => object|null|Promise<object|null>} load
 *   Load session(s). With a platform, returns that platform's session or null.
 *   Without a platform, returns all sessions as an object.
 * @property {(platform: string, session: object) => boolean|Promise<boolean>} save
 *   Persist a session for the given platform. Returns true on success.
 * @property {(platform?: string|null) => boolean|Promise<boolean>} clear
 *   Remove session(s). With a platform, clears only that platform.
 *   Without a platform, clears all sessions. Returns true on success.
 */

/**
 * Create an in-memory SessionStore for tests.
 * @param {Object} [initial={}]
 * @returns {SessionStore}
 */
export function createMemorySessionStore(initial = {}) {
  const sessions = new Map(Object.entries(initial));

  return {
    load(platform = null) {
      if (platform) {
        const session = sessions.get(platform);
        if (!session) return null;
        // Simulate TTL check for test realism
        const ttl = session._ttl || 24 * 60 * 60 * 1000;
        if (session.timestamp && Date.now() - session.timestamp > ttl) {
          return null;
        }
        return session;
      }
      return Object.fromEntries(sessions);
    },
    save(platform, session) {
      sessions.set(platform, { platform, ...session });
      return true;
    },
    clear(platform = null) {
      if (platform) {
        sessions.delete(platform);
      } else {
        sessions.clear();
      }
      return true;
    },
  };
}
