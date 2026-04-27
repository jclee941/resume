export function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out = {};
  for (const pair of cookieHeader.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  if (options.httpOnly !== false) segments.push('HttpOnly');
  if (options.secure !== false) segments.push('Secure');
  segments.push(`SameSite=${options.sameSite ?? 'Strict'}`);
  return segments.join('; ');
}

export function clearCookieHeader(name, options = {}) {
  return serializeCookie(name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}
