import { BUILD_ETAG_VERSION, LAST_MODIFIED } from './constants.js';

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
  // 'private' forbids shared/CDN caching (prevents nonce mismatch: body cached,
  // header regenerated). 'no-cache' forces revalidation on reuse but — unlike
  // 'no-store' — keeps the page eligible for the browser back/forward cache
  // (bfcache restores the in-memory page with its original nonce, so CSP is safe).
  return 'private, no-cache';
}

function acceptedEncodings(headerValue) {
  return String(headerValue || '')
    .toLowerCase()
    .split(',')
    .map((item) => {
      const [encoding, ...params] = item.split(';').map((part) => part.trim());
      if (!encoding) return '';

      const qualityParam = params.find((part) => part.startsWith('q='));
      if (!qualityParam) return encoding;

      const quality = Number(qualityParam.slice(2));
      return Number.isFinite(quality) && quality > 0 ? encoding : '';
    })
    .filter(Boolean);
}

function buildWeakEtag(pathname, requestContext) {
  const slug = pathname.replace(/[^a-z0-9/_-]/gi, '').replace(/\//g, '_') || 'root';
  const languageScope = requestContext.language ? `-${requestContext.language}` : '';
  return `W/"${slug}${languageScope}-${BUILD_ETAG_VERSION}"`;
}

function etagMatches(ifNoneMatch, currentEtag) {
  const normalize = (tag) => String(tag).trim().replace(/^W\//, '');
  const candidates = String(ifNoneMatch)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (candidates.includes('*')) {
    return true;
  }

  const current = normalize(currentEtag);
  return candidates.some((candidate) => normalize(candidate) === current);
}

function isNotModifiedSince(ifModifiedSince) {
  const requestTimestamp = Date.parse(ifModifiedSince);
  const lastModifiedTimestamp = Date.parse(LAST_MODIFIED);
  return (
    Number.isFinite(requestTimestamp) &&
    Number.isFinite(lastModifiedTimestamp) &&
    requestTimestamp >= lastModifiedTimestamp
  );
}

// RFC 7232 conditional GET/HEAD: opt-in only, never for unsafe methods or
// no-store resources. If-None-Match takes precedence over If-Modified-Since —
// when a client sends both, the date validator is ignored.
function isConditionalRequestFresh(cacheControl, requestContext, etag) {
  if (!requestContext.conditionalRequests) {
    return false;
  }

  const method = requestContext.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  if (cacheControl.includes('no-store')) {
    return false;
  }

  if (requestContext.ifNoneMatch != null) {
    return etagMatches(requestContext.ifNoneMatch, etag);
  }

  if (requestContext.ifModifiedSince != null) {
    return isNotModifiedSince(requestContext.ifModifiedSince);
  }

  return false;
}

function buildNotModifiedResponse(headers) {
  const notModified = new Headers(headers);
  notModified.delete('Content-Type');
  notModified.delete('Content-Length');
  notModified.delete('Content-Encoding');
  return new Response(null, {
    status: 304,
    statusText: 'Not Modified',
    headers: notModified,
  });
}

function canCompressResponse(response, pathname, requestContext) {
  if (response.status === 204 || response.status === 304 || !response.body) {
    return false;
  }
  if (response.headers.has('Content-Encoding')) {
    return false;
  }
  if (typeof CompressionStream !== 'function') {
    return false;
  }
  if (!acceptedEncodings(requestContext.acceptEncoding).includes('gzip')) {
    return false;
  }

  const contentType = response.headers.get('Content-Type') || '';
  return (
    contentType.includes('text/html') ||
    contentType.includes('application/javascript') ||
    contentType.includes('application/json') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.txt')
  );
}

function applyResponseHeaders(response, pathname, requestContext = {}) {
  const headers = new Headers(response.headers);
  const cacheControl = getCacheControlForPath(pathname);
  headers.set('Cache-Control', cacheControl);
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
    headers.set('ETag', buildWeakEtag(pathname, requestContext));
  }

  if (
    response.status === 200 &&
    isConditionalRequestFresh(cacheControl, requestContext, headers.get('ETag'))
  ) {
    return buildNotModifiedResponse(headers);
  }

  if (canCompressResponse(response, pathname, requestContext)) {
    headers.set('Content-Encoding', 'gzip');
    headers.delete('Content-Length');
    return new Response(response.body.pipeThrough(new CompressionStream('gzip')), {
      status: response.status,
      statusText: response.statusText,
      headers,
      encodeBody: 'manual',
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { acceptedEncodings, applyResponseHeaders, getCacheControlForPath, mergeVaryHeader };
