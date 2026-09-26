/**
 * @typedef {{
 *   sessionStore?: {
 *     load(normalized: string): Promise<unknown>,
 *     save(normalized: string, record: Record<string, unknown>): Promise<void>,
 *   } | null,
 *   logger: {
 *     error(message: string, ...args: unknown[]): void,
 *     [key: string]: unknown,
 *   },
 * }} SessionBrokerServiceLike
 *
 * @typedef {{
 *   cookieString?: string | null,
 *   cookies?: Array<{ name?: string, value?: string, [key: string]: unknown }>,
 *   renewedAt?: string | number | null,
 *   extractedAt?: string | number | null,
 *   expiresAt?: string | number | null,
 *   [key: string]: unknown,
 * }} SessionRenewalInput
 */

/**
 * @param {SessionBrokerServiceLike} service
 * @param {string} normalized
 * @returns {Promise<unknown>}
 */
export async function loadSession(service, normalized) {
  if (service.sessionStore && typeof service.sessionStore.load === 'function') {
    const raw = await service.sessionStore.load(normalized);
    if (raw == null) return null;

    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
      service.logger.error(
        '[SessionBrokerService] Failed to parse session:',
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  try {
    const { default: SessionManager } = await import('../../shared/services/session/index.js');
    return (
      /** @type {{ load(p?: string | null): unknown }} */ (SessionManager).load(normalized) ?? null
    );
  } catch (error) {
    service.logger.error(
      '[SessionBrokerService] SessionManager load failed:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * @param {SessionBrokerServiceLike} service
 * @param {string} normalized
 * @param {Record<string, unknown>} session
 * @returns {Promise<void>}
 */
export async function saveSession(service, normalized, session) {
  const record = {
    platform: normalized,
    ...session,
  };

  if (service.sessionStore && typeof service.sessionStore.save === 'function') {
    await service.sessionStore.save(normalized, record);
    return;
  }

  try {
    const { default: SessionManager } = await import('../../shared/services/session/index.js');
    /** @type {{ save(p: string, r: Record<string, unknown>): unknown }} */ (SessionManager).save(
      normalized,
      record
    );
  } catch (error) {
    service.logger.error(
      '[SessionBrokerService] SessionManager save failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * @param {SessionRenewalInput | null | undefined} session
 * @returns {{ cookieString: string, renewedAt: string | number | null, expiresAt: string | number | null } | null}
 */
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
