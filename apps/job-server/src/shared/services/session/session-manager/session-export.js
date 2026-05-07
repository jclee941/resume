export const sessionExportMethods = {
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
      this.logger.error('[SessionManager.getEncryptedSession] Failed:', e.message);
      return null;
    }
  },

  restoreEncryptedSession(platform, encryptedData) {
    try {
      const payload = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));

      if (payload.platform !== platform) {
        this.logger.error('[SessionManager.restoreEncryptedSession] Platform mismatch');
        return false;
      }

      return this.save(platform, payload.session);
    } catch (e) {
      this.logger.error('[SessionManager.restoreEncryptedSession] Failed:', e.message);
      return false;
    }
  },
};
