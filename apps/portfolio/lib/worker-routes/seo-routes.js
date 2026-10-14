'use strict';

const { defaultOwnerIdentity } = require('../owner-identity');

/**
 * Generate SEO and binary asset routes.
 * Lines 995-1050 of original template.
 * @param {{ contactEmail?: string }} [options] - security.txt contact; defaults to the master resume owner
 */
function generateSeoRoutes({ contactEmail = defaultOwnerIdentity().email } = {}) {
  return `
      if (url.pathname === '/robots.txt') {
        metrics.requests_success++;
        return new Response(ROBOTS_TXT, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }

      if (url.pathname === '/.well-known/security.txt' || url.pathname === '/security.txt') {
        metrics.requests_success++;
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + 'Z';
        const securityTxt = [
          'Contact: mailto:${contactEmail}',
          'Preferred-Languages: ko, en',
          'Canonical: https://resume.jclee.me/.well-known/security.txt',
          'Policy: https://resume.jclee.me/#contact',
          'Hiring: https://resume.jclee.me/#contact',
          \`Expires: \${expires}\`,
          ''
        ].join('\\n');
        return new Response(securityTxt, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }

      if (url.pathname === '/sitemap.xml') {
        metrics.requests_success++;
        return new Response(SITEMAP_XML, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/xml'
          }
        });
      }

      if (['/og-image.png', '/og-image-en.png', '/og-image-ja.png'].includes(url.pathname)) {
        const assetUrl = new URL('/social' + url.pathname, request.url);
        // ASSETS answers If-None-Match / If-Modified-Since with 304 plus its strong ETag, so
        // only those two are forwarded (a full header copy once turned that 304 into a 404).
        // ASSETS ignores Range, so byte ranges are cut from the full body below.
        const assetHeaders = new Headers();
        for (const name of ['If-None-Match', 'If-Modified-Since']) {
          if (request.headers.has(name)) assetHeaders.set(name, request.headers.get(name));
        }
        const assetResponse = env.ASSETS
          ? await env.ASSETS.fetch(
              new Request(assetUrl, { method: request.method, headers: assetHeaders })
            )
          : null;
        const headers = {
          ...applyNonceToHeaders(SECURITY_HEADERS, ''),
          ...CACHE_POLICIES.static,
          ...rateLimitHeaders,
        };
        if (assetResponse && (assetResponse.ok || assetResponse.status === 304)) {
          metrics.requests_success++;
          // Carrying the asset ETag keeps the response-header post-processing from adding its
          // own weak ETag, so the client sees exactly one validator.
          const imageHeaders = { ...headers, 'Accept-Ranges': 'bytes' };
          const etag = assetResponse.headers.get('ETag');
          if (etag) imageHeaders.ETag = etag;
          // Also on the 304: without it the runtime labels the bodiless response text/html.
          imageHeaders['Content-Type'] = 'image/png';
          if (assetResponse.status === 304) {
            return new Response(null, { status: 304, headers: imageHeaders });
          }
          const range = /^bytes=([0-9]*)-([0-9]*)$/.exec(request.headers.get('Range') || '');
          const ifRange = request.headers.get('If-Range');
          // A single well-formed byte range on GET; anything else (multi-range, last < first,
          // stale If-Range) is ignored and answered with the full 200 per RFC 9110.
          const rangeApplies =
            request.method === 'GET' &&
            range &&
            (range[1] || range[2]) &&
            (!range[1] || !range[2] || Number(range[2]) >= Number(range[1])) &&
            (!ifRange || ifRange === etag);
          if (rangeApplies) {
            const bytes = new Uint8Array(await assetResponse.arrayBuffer());
            const size = bytes.length;
            const first = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
            const last = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
            if (first >= size || (!range[1] && Number(range[2]) === 0)) {
              return new Response(null, {
                status: 416,
                headers: { ...imageHeaders, 'Content-Range': 'bytes */' + size },
              });
            }
            return new Response(bytes.slice(first, last + 1), {
              status: 206,
              headers: {
                ...imageHeaders,
                'Content-Range': 'bytes ' + first + '-' + last + '/' + size,
              },
            });
          }
          return new Response(assetResponse.body, {
            status: assetResponse.status,
            headers: imageHeaders,
          });
        }
        metrics.requests_error++;
        return new Response('Not Found', {
          status: 404,
          headers: { ...headers, 'Content-Type': 'text/plain' },
        });
      }

      if (url.pathname === '/og-image.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'image/webp',
          }
        });
      }

      if (url.pathname === '/og-image-en.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_EN_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'image/webp',
          }
        });
      }

      if (url.pathname === '/og-image-ja.webp' && OG_IMAGE_JA_BASE64) {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_JA_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'image/webp',
          }
        });
      }

      if (url.pathname === '/resume.pdf' || url.pathname === '/resume-full.pdf') {
        const isFullCv = url.pathname === '/resume-full.pdf';
        const assetPath = isFullCv ? '/resume-full.pdf' : '/resume.pdf';
        const downloadName = isFullCv ? 'resume_jclee_full.pdf' : 'resume_jclee.pdf';
        const assetResponse = env.ASSETS
          ? await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request))
          : null;
        if (assetResponse && assetResponse.ok) {
          metrics.requests_success++;
          const headers = new Headers(assetResponse.headers);
          Object.entries({
            ...applyNonceToHeaders(SECURITY_HEADERS, ''),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
          }).forEach(([k, v]) => headers.set(k, v));
          headers.set('Content-Type', 'application/pdf');
          headers.set('Content-Disposition', 'inline; filename="' + downloadName + '"');
          return new Response(assetResponse.body, { status: 200, headers });
        }
        metrics.requests_error++;
        return new Response('Resume PDF not found', { status: 404 });
      }`;
}

module.exports = { generateSeoRoutes };
