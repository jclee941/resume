export async function loadSession(service, normalized) {
  if (service.sessionStore && typeof service.sessionStore.get === 'function') {
    const raw = service.sessionStore.get(normalized);
    if (raw == null) return null;

    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
      service.logger.error('[SessionBrokerService] Failed to parse session:', error.message);
      return null;
    }
  }

  try {
    const { SessionManager } = await import('./index.js');
    return SessionManager.load(normalized) ?? null;
  } catch (error) {
    service.logger.error('[SessionBrokerService] SessionManager load failed:', error.message);
    return null;
  }
}

export async function saveSession(service, normalized, session) {
  const record = {
    platform: normalized,
    ...session,
  };

  if (service.sessionStore && typeof service.sessionStore.set === 'function') {
    service.sessionStore.set(normalized, JSON.stringify(record));
    return;
  }

  try {
    const { SessionManager } = await import('./index.js');
    SessionManager.save(normalized, record);
  } catch (error) {
    service.logger.error('[SessionBrokerService] SessionManager save failed:', error.message);
  }
}

export function normalizeRenewalResult(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  let cookieString = typeof session.cookieString === 'string' ? session.cookieString : null;
  if (!cookieString && Array.isArray(session.cookies)) {
    cookieString = session.cookies
      .map((c) => `${c.name ?? ''}=${c.value ?? ''}`)
      .filter((pair) => pair !== '=')
      .join('; ');
  }

  return {
    cookieString: cookieString ?? '',
    renewedAt: session.renewedAt ?? session.extractedAt ?? null,
    expiresAt: session.expiresAt ?? null,
  };
}
