export function getErrorStatusCode(error) {
  const candidates = [
    error?.statusCode,
    error?.status,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function classifyApplyError(error) {
  const statusCode = getErrorStatusCode(error);
  const message = String(error?.message || '').toLowerCase();

  if (statusCode === 400 && (message.includes('already') || message.includes('duplicate'))) {
    return 'already_applied';
  }
  if (statusCode === 401 || statusCode === 403) {
    return 'auth_failed';
  }
  if (statusCode === 429) {
    return 'rate_limited';
  }
  return 'apply_failed';
}
