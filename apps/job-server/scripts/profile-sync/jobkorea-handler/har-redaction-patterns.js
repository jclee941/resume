export const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
  'x-csrf-token',
  'x-xsrf-token',
]);

export const SENSITIVE_FIELD_PATTERNS = [
  /cookie/i,
  /token/i,
  /csrf/i,
  /xsrf/i,
  /password/i,
  /passwd/i,
  /secret/i,
  /session/i,
  /auth/i,
  /credential/i,
  /birth/i,
  /phone/i,
  /email/i,
  /address/i,
  /jumin/i,
  /resident/i,
];

const REDACTED = '[REDACTED]';

export function redactSensitiveValue(key, value) {
  const normalizedKey = String(key ?? '').trim();
  if (!normalizedKey) {
    return value;
  }

  const lowerKey = normalizedKey.toLowerCase();
  if (SENSITIVE_HEADER_NAMES.has(lowerKey)) {
    return REDACTED;
  }

  if (SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey))) {
    return REDACTED;
  }

  return value;
}
