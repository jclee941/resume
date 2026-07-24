let localProbeCounter = 0;

function getBaseUrl(testInfo) {
  const configured = testInfo.project?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL;
  const fallback = process.env.CI ? 'http://localhost:8787' : '';
  return String(configured || fallback).replace(/\/+$/, '');
}

function isLocalBaseUrl(testInfo) {
  return /127\.0\.0\.1|localhost/.test(getBaseUrl(testInfo));
}

function requestOptions(testInfo) {
  if (!isLocalBaseUrl(testInfo)) {
    return { failOnStatusCode: false };
  }

  localProbeCounter = (localProbeCounter + 1) % 200;
  return {
    failOnStatusCode: false,
    headers: {
      'cf-connecting-ip': `203.0.113.${localProbeCounter + 1}`,
    },
  };
}

function skipIfLocalRateLimited(response, endpoint, testInfo) {
  if (isLocalBaseUrl(testInfo) && response.status() === 429) {
    const { test } = require('@playwright/test');
    test.skip(true, `Local worker rate limited ${endpoint} during PWA verification`);
  }
}

module.exports = { requestOptions, skipIfLocalRateLimited };
