'use strict';

/**
 * Generate SEO and binary asset routes.
 * Lines 995-1050 of original template.
 */
function generateSeoRoutes() {
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
          'Contact: mailto:qws941@kakao.com',
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

      if (url.pathname === '/resume.pdf') {
        // resume.pdf is shipped as a static asset (assets/resume.pdf) and is
        // normally served by the assets binding before this worker route runs.
        // This handler is a fallback that reads the same asset via env.ASSETS so
        // the PDF is never inlined as base64 in the worker bundle. We re-assert
        // the Content-Type and a download-friendly Content-Disposition here.
        const assetResponse = env.ASSETS
          ? await env.ASSETS.fetch(new Request(new URL('/resume.pdf', request.url), request))
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
          headers.set('Content-Disposition', 'inline; filename="resume_jclee.pdf"');
          return new Response(assetResponse.body, { status: 200, headers });
        }
        metrics.requests_error++;
        return new Response('Resume PDF not found', { status: 404 });
      }`;
}

module.exports = { generateSeoRoutes };
