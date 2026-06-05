const BUILD_LASTMOD = '2026-06-05';

// Derive HTTP-format Last-Modified and ETag from BUILD_LASTMOD so they cannot drift.
const BUILD_LASTMOD_HTTP = (() => {
  const d = new Date(`${BUILD_LASTMOD}T00:00:00Z`);
  return d.toUTCString();
})();

const BUILD_ETAG_VERSION = BUILD_LASTMOD.replace(/-/g, '');
const LAST_MODIFIED = BUILD_LASTMOD_HTTP;
const SITEMAP_LASTMOD = BUILD_LASTMOD;
const SITEMAP_ETAG = `W/"resume-sitemap-${BUILD_ETAG_VERSION}"`;
const DEFAULT_LANGUAGE = 'ko';
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'];
const SINGLE_WORKER_PROFILE_SYNC_PATH = '/api/automation/resume-update';
const SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN = /^\/api\/automation\/resume-update\/([^/]+)$/;
const JOB_ROUTE_PREFIX = '/job';
const LOCALE_ROUTES = new Set(['/', '/ko', '/ko/', '/en', '/en/', '/ja', '/ja/']); // /ja kept for redirect
const HREFLANG_LINKS = [
  '<link rel="alternate" hreflang="ko-KR" href="https://resume.jclee.me/" />',
  '<link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/" />',
  '<link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/" />',
  '<link rel="alternate" hreflang="x-default" href="https://resume.jclee.me/" />',
].join('\n    ');

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://resume.jclee.me/</loc>
    <lastmod>${SITEMAP_LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ko-KR" href="https://resume.jclee.me/"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/"/>
    <xhtml:link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://resume.jclee.me/"/>
  </url>
  <url>
    <loc>https://resume.jclee.me/en/</loc>
    <lastmod>${SITEMAP_LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko-KR" href="https://resume.jclee.me/"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/"/>
    <xhtml:link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://resume.jclee.me/"/>
  </url>
  <url>
    <loc>https://resume.jclee.me/ja/</loc>
    <lastmod>${SITEMAP_LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko-KR" href="https://resume.jclee.me/"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/"/>
    <xhtml:link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://resume.jclee.me/"/>
  </url>
</urlset>`;

export {
  DEFAULT_LANGUAGE,
  HREFLANG_LINKS,
  JOB_ROUTE_PREFIX,
  LAST_MODIFIED,
  LOCALE_ROUTES,
  SINGLE_WORKER_PROFILE_SYNC_PATH,
  SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN,
  SITEMAP_ETAG,
  SITEMAP_XML,
  SUPPORTED_LANGUAGES,
};
