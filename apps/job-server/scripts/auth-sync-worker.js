export async function syncToWorker(session, config, log) {
  if (!session || (!session.cookies && !session.cookieString)) {
    return false;
  }
  log('Syncing to Worker', 'info', session.platform);
  try {
    const response = await fetch(`${config.JOB_WORKER_URL}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Sync-Secret': config.AUTH_SYNC_SECRET || '',
      },
      body: JSON.stringify({
        platform: session.platform,
        cookies:
          session.cookieString ||
          (Array.isArray(session.cookies)
            ? session.cookies.map((c) => `${c.name}=${c.value}`).join('; ')
            : session.cookies),
        email: session.email,
        expiresIn: 24 * 60 * 60 * 1000,
      }),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      log('Synced to Worker', 'success', session.platform);
      return true;
    }
    log(`Sync failed: ${result.error || response.status}`, 'error', session.platform);
    return false;
  } catch (error) {
    log(`Sync error: ${error.message}`, 'error', session.platform);
    return false;
  }
}
