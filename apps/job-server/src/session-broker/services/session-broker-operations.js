import { normalizePlatform, SESSION_STATES } from './session-broker-constants.js';
import { getState, setState } from './session-broker-state.js';
import { loadSession, normalizeRenewalResult, saveSession } from './session-broker-storage.js';

function getLoginFlow(service, normalized) {
  const factory = service.loginFlowFactories[normalized];
  if (typeof factory === 'function') {
    return factory();
  }

  return service.loginFlows[normalized] ?? null;
}

export async function checkSession(service, platform) {
  const normalized = normalizePlatform(platform);

  const currentState = getState(service, normalized);
  if (currentState === SESSION_STATES.RENEWING) {
    return { valid: false, error: 'Session renewal in progress' };
  }

  const session = await loadSession(service, normalized);
  if (!session) {
    setState(service, normalized, {
      state: SESSION_STATES.EXPIRED,
      lastError: 'No stored session',
      expiresAt: null,
      renewedAt: null,
    });
    return { valid: false, error: 'No stored session' };
  }

  const expiresAtRaw = session.expiresAt ?? null;
  const renewedAtRaw = session.renewedAt ?? session.extractedAt ?? session.timestamp ?? null;

  const expiresMs = expiresAtRaw ? Date.parse(expiresAtRaw) : NaN;
  const renewedMs = renewedAtRaw ? Date.parse(renewedAtRaw) : NaN;

  if (!Number.isFinite(expiresMs) || !Number.isFinite(renewedMs)) {
    setState(service, normalized, {
      state: SESSION_STATES.EXPIRED,
      lastError: 'Invalid session timestamps',
      expiresAt: expiresAtRaw,
      renewedAt: renewedAtRaw,
    });
    return { valid: false, error: 'Invalid session timestamps' };
  }

  const now = service.nowFn();

  if (now >= expiresMs) {
    setState(service, normalized, {
      state: SESSION_STATES.EXPIRED,
      lastError: null,
      expiresAt: expiresAtRaw,
      renewedAt: renewedAtRaw,
    });
    return { valid: false, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
  }

  const lifetime = expiresMs - renewedMs;
  const elapsed = now - renewedMs;

  if (lifetime > 0 && elapsed >= lifetime * service.ttlThreshold) {
    setState(service, normalized, {
      state: SESSION_STATES.RENEW_NEEDED,
      lastError: null,
      expiresAt: expiresAtRaw,
      renewedAt: renewedAtRaw,
    });
    return { valid: true, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
  }

  setState(service, normalized, {
    state: SESSION_STATES.VALID,
    lastError: null,
    expiresAt: expiresAtRaw,
    renewedAt: renewedAtRaw,
  });
  return { valid: true, expiresAt: expiresAtRaw, renewedAt: renewedAtRaw };
}

export async function renewSession(service, platform) {
  const normalized = normalizePlatform(platform);

  const flow = getLoginFlow(service, normalized);
  if (!flow) {
    const error = `No login flow available for platform: ${normalized}`;
    setState(service, normalized, {
      state: SESSION_STATES.EXPIRED,
      lastError: error,
    });
    return { success: false, error };
  }

  setState(service, normalized, {
    state: SESSION_STATES.RENEWING,
    lastError: null,
  });

  let lastError;
  for (let attempt = 1; attempt <= service.retryAttempts; attempt++) {
    try {
      service.logger.log?.(
        `[SessionBrokerService] Renewing ${normalized} (attempt ${attempt}/${service.retryAttempts})`
      );

      const rawSession =
        typeof flow.renew === 'function' ? await flow.renew() : await flow.execute(normalized);

      const normalizedSession = normalizeRenewalResult(rawSession);
      if (!normalizedSession) {
        throw new Error('Login flow returned invalid session');
      }

      await saveSession(service, normalized, normalizedSession);

      setState(service, normalized, {
        state: SESSION_STATES.VALID,
        lastError: null,
        expiresAt: normalizedSession.expiresAt,
        renewedAt: normalizedSession.renewedAt,
      });

      return {
        success: true,
        session: {
          platform: normalized,
          ...normalizedSession,
        },
      };
    } catch (error) {
      lastError = error;
      service.logger.error?.(
        `[SessionBrokerService] Renewal attempt ${attempt} failed: ${error.message}`
      );

      if (attempt < service.retryAttempts) {
        await service.sleepFn(service.retryDelayMs);
      }
    }
  }

  const errorMessage = lastError?.message ?? 'Max retry attempts exceeded';
  setState(service, normalized, {
    state: SESSION_STATES.EXPIRED,
    lastError: errorMessage,
  });
  return { success: false, error: errorMessage };
}

export async function getValidSession(service, platform) {
  const normalized = normalizePlatform(platform);
  const check = await checkSession(service, normalized);
  const stateAfterCheck = getState(service, normalized);

  if (stateAfterCheck === SESSION_STATES.VALID && check.valid) {
    return { valid: true, session: check };
  }

  if (
    stateAfterCheck === SESSION_STATES.RENEW_NEEDED ||
    stateAfterCheck === SESSION_STATES.EXPIRED
  ) {
    const renewal = await renewSession(service, normalized);
    if (renewal.success) {
      return { valid: true, session: renewal.session };
    }

    return { valid: false, error: renewal.error };
  }

  return {
    valid: false,
    error: check.error ?? 'Unknown session state',
  };
}

export async function validateEncryptedSession(service, platform, encryptedSession) {
  try {
    const decrypted = service.encryptionService.decrypt(encryptedSession);
    if (!decrypted || decrypted.platform !== platform) {
      return { valid: false, error: 'Invalid session or platform mismatch' };
    }

    return { valid: true, decrypted };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export async function getHealth(service) {
  const platforms = {};

  for (const platformName of service.platforms) {
    const normalized = normalizePlatform(platformName);
    const session = await loadSession(service, normalized);

    if (!session) {
      setState(service, normalized, {
        state: SESSION_STATES.EXPIRED,
        lastError: 'No stored session',
        expiresAt: null,
        renewedAt: null,
      });
      platforms[normalized] = {
        state: SESSION_STATES.EXPIRED,
        valid: false,
        expiresAt: null,
        renewedAt: null,
        lastError: 'No stored session',
      };
      continue;
    }

    const check = await checkSession(service, normalized);
    const entry = service.stateStore.get(normalized) ?? {};

    platforms[normalized] = {
      state: entry.state ?? SESSION_STATES.EXPIRED,
      valid: check.valid === true,
      expiresAt: check.expiresAt ?? entry.expiresAt ?? null,
      renewedAt: check.renewedAt ?? entry.renewedAt ?? null,
      lastError: entry.lastError ?? null,
    };
  }

  const allValid = Object.values(platforms).every((platform) => platform.valid);

  return {
    status: allValid ? 'healthy' : 'degraded',
    platforms,
  };
}
