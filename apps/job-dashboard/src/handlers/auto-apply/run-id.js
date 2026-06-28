export function getAutoApplyRunId(body) {
  if (typeof body.runId === 'string' && body.runId.trim().length > 0) {
    return body.runId.trim();
  }

  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `auto-apply-${Date.now()}`;
}
