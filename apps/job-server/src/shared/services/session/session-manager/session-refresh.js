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

export const sessionRefreshMethods = {
  async tryRefresh(platform) {
    try {
      await runCdpSessionExtraction(platform);
      const session = this.load(platform);
      return !!(session && session.timestamp && Date.now() - session.timestamp < 60000);
    } catch (error) {
      this.logger.error('[SessionManager.tryRefresh] CDP extraction failed:', error.message);
      return false;
    }
  },
};
