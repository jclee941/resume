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
