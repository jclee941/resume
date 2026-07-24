const TRACKING_PARAMETERS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  '_ga',
  '_gl',
]);

const SENSITIVE_QUERY_PARAMETERS = new Set([
  'access_token',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'code',
  'cookie',
  'password',
  'session',
  'session_id',
  'sessionid',
  'sid',
  'sig',
  'signature',
  'token',
]);

function shouldRemoveQueryParameter(name) {
  const normalizedName = name.toLowerCase();
  return (
    normalizedName.startsWith('utm_') ||
    normalizedName.endsWith('_secret') ||
    normalizedName.endsWith('_token') ||
    TRACKING_PARAMETERS.has(normalizedName) ||
    SENSITIVE_QUERY_PARAMETERS.has(normalizedName)
  );
}

export function canonicalizeJobUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    url.username = '';
    url.password = '';
    url.hash = '';
    for (const name of [...url.searchParams.keys()]) {
      if (shouldRemoveQueryParameter(name)) url.searchParams.delete(name);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}
