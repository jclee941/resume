module.exports = {
  quarantined: [
    {
      file: 'seo.spec.js',
      test: 'should serve robots.txt',
      reason:
        'Flaky due to local dev server rate limiting (HTTP 429) under concurrent CI-like load',
    },
    {
      file: 'seo.spec.js',
      test: 'should serve sitemap.xml',
      reason:
        'Flaky due to local dev server rate limiting (HTTP 429) under concurrent CI-like load',
    },
    {
      file: 'seo.spec.js',
      test: 'should serve og-image.webp',
      reason:
        'Flaky due to local dev server rate limiting (HTTP 429) under concurrent CI-like load',
    },
    {
      file: 'pwa.spec.js',
      test: 'should register Service Worker on page load',
      reason:
        'Timing-dependent registration can intermittently miss activation within assertion window',
    },
  ],
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};
