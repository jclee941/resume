import { normalizePlatform, SESSION_STATES } from './session-broker-constants.js';

export function getState(service, platform) {
  const normalized = normalizePlatform(platform);
  const entry = service.stateStore.get(normalized);
  return entry?.state ?? SESSION_STATES.EXPIRED;
}

export function getStateEntry(service, platform) {
  const normalized = normalizePlatform(platform);
  return service.stateStore.get(normalized) ?? null;
}

export function setState(service, platform, stateOrEntry) {
  const normalized = normalizePlatform(platform);
  const existing = service.stateStore.get(normalized) ?? {};
  const patch = typeof stateOrEntry === 'string' ? { state: stateOrEntry } : (stateOrEntry ?? {});
  service.stateStore.set(normalized, { ...existing, ...patch });
}
