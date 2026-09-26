/**
 * @param {string} platform
 * @returns {Promise<void>}
 */
export async function runCdpSessionExtraction(platform) {
  const { execSync } = await import('child_process');
  const { fileURLToPath } = await import('url');
  const { dirname: dn, join: jn } = await import('path');
  const __dirname = dn(fileURLToPath(import.meta.url));
  const cdpScript = jn(
    __dirname,
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
    timeout: 15000,
  });
}

/**
 * @typedef {Object} SessionRefreshHost
 * @property {(platform: string) => Promise<void> | void} runSessionExtraction
 * @property {(platform: string) => { timestamp?: number } | null} load
 * @property {{ error: (...args: unknown[]) => void }} logger
 */

export const sessionRefreshMethods = {
  /**
   * @this {SessionRefreshHost}
   * @param {string} platform
   * @returns {Promise<boolean>}
   */
  async tryRefresh(platform) {
    try {
      await this.runSessionExtraction(platform);
      const session = this.load(platform);
      return !!(session && session.timestamp && Date.now() - session.timestamp < 60000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('[SessionManager.tryRefresh] CDP extraction failed:', message);
      return false;
    }
  },
};
