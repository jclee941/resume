/**
 * @typedef {Object} SessionDataLike
 * @property {number} [timestamp]
 * @property {Record<string, unknown>} [cookies]
 * @property {Record<string, unknown>} [tokens]
 */

/**
 * @typedef {Object} SessionExportHost
 * @property {(platform: string) => SessionDataLike | null} load
 * @property {(platform: string, session: unknown) => boolean} save
 * @property {{ error: (...args: unknown[]) => void }} logger
 */

export const sessionExportMethods = {
  /**
   * @this {SessionExportHost}
   * @param {string} platform
   * @returns {string | null}
   */
  getEncryptedSession(platform) {
    const session = this.load(platform);
    if (!session) return null;

    try {
      const payload = JSON.stringify({
        platform,
        session,
        exportedAt: Date.now(),
      });
      return Buffer.from(payload).toString('base64');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('[SessionManager.getEncryptedSession] Failed:', message);
      return null;
    }
  },

  /**
   * @this {SessionExportHost}
   * @param {string} platform
   * @param {string} encryptedData
   * @returns {boolean}
   */
  restoreEncryptedSession(platform, encryptedData) {
    try {
      const payload = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));

      if (payload.platform !== platform) {
        this.logger.error('[SessionManager.restoreEncryptedSession] Platform mismatch');
        return false;
      }

      return this.save(platform, payload.session);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('[SessionManager.restoreEncryptedSession] Failed:', message);
      return false;
    }
  },
};
