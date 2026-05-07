import { LAST_MODIFIED } from './constants.js';

function mergeVaryHeader(existingValue, valuesToAdd) {
  const merged = new Set(
    String(existingValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  for (const value of valuesToAdd) {
    merged.add(value);
  }

  return Array.from(merged).join(', ');
}

function getCacheControlForPath(pathname) {
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/metrics') {
    return 'no-cache, no-store, must-revalidate';
  }
  if (pathname.startsWith('/api/')) {
    return 'no-store';
  }

  const isStaticAsset = /\.(?:css|js|mjs|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|map)$/i.test(
    pathname
  );
  if (isStaticAsset) {
    const isHashed = /[.-][a-f0-9]{8,}\./i.test(pathname);
    return isHashed
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400, must-revalidate';
  }

  if (pathname.endsWith('.pdf') || pathname.endsWith('.docx')) {
    return 'public, max-age=86400, must-revalidate';
  }

  // HTML pages: nonce-bearing CSP requires per-response uniqueness.
  // Caching HTML at CDN causes nonce mismatch (body cached, header regenerated).
  // Per Oracle review: HTML responses with dynamic nonces MUST NOT be shared-cacheable.
  return 'private, no-store, must-revalidate';
}

function applyResponseHeaders(response, pathname, requestContext = {}) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', getCacheControlForPath(pathname));
  const varyValues = ['Accept-Encoding'];
  if (requestContext.varyAcceptLanguage) {
    varyValues.push('Accept-Language');
  }
  headers.set('Vary', mergeVaryHeader(headers.get('Vary'), varyValues));

  if (requestContext.language) {
    headers.set('X-Detected-Language', requestContext.language);
    headers.set('X-Language-Source', requestContext.source || 'default');
  }

  if (!headers.has('Last-Modified')) {
    headers.set('Last-Modified', LAST_MODIFIED);
  }

  if (!headers.has('ETag')) {
    const weakTag = pathname.replace(/[^a-z0-9/_-]/gi, '').replace(/\//g, '_') || 'root';
    headers.set('ETag', `W/"${weakTag}-2026-02-15"`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { applyResponseHeaders, getCacheControlForPath, mergeVaryHeader };
