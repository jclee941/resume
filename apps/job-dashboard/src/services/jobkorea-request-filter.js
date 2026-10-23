/**
 * @fileoverview Request interception shared by every Browser Rendering flow that opens JobKorea
 * pages. Third-party ad/analytics scripts are what push JobKorea pages past DOMContentLoaded, so
 * anything served from outside jobkorea.co.kr is aborted, along with the resource types a caller
 * does not need.
 * @module services/jobkorea-request-filter
 */

/**
 * @param {string} hostname
 * @returns {boolean}
 */
export function isJobKoreaHost(hostname) {
  return hostname === 'jobkorea.co.kr' || hostname.endsWith('.jobkorea.co.kr');
}

/**
 * @param {import('@cloudflare/puppeteer').HTTPRequest} request
 * @param {ReadonlySet<string>} blockedTypes
 * @returns {boolean} true for a blocked resource type and anything served from outside jobkorea.co.kr
 */
function shouldBlock(request, blockedTypes) {
  if (blockedTypes.has(request.resourceType())) return true;
  const target = request.url();
  return !URL.canParse(target) || !isJobKoreaHost(new URL(target).hostname);
}

/**
 * @param {import('@cloudflare/puppeteer').HTTPRequest} request
 * @returns {string} resource type plus host and path (never the query string)
 */
function describe(request) {
  const target = request.url();
  if (!URL.canParse(target)) return `${request.resourceType()} unparseable-url`;
  const { host, pathname } = new URL(target);
  return `${request.resourceType()} ${host}${pathname}`;
}

/**
 * Never throws: a request that is already handled or a closed page must not fail the caller.
 * @param {ReadonlySet<string>} blockedTypes
 * @param {Map<import('@cloudflare/puppeteer').HTTPRequest, string>} pending
 * @returns {(request: import('@cloudflare/puppeteer').HTTPRequest) => void}
 */
function handleRequest(blockedTypes, pending) {
  return (request) => {
    try {
      if (shouldBlock(request, blockedTypes)) {
        Promise.resolve(request.abort()).catch(() => {});
        return;
      }
      const settled = request.continue();
      pending.set(request, describe(request));
      Promise.resolve(settled).catch(() => pending.delete(request));
    } catch {
      // Intentionally ignored, see above.
    }
  };
}

/**
 * Enables request interception on the page and confines it to jobkorea.co.kr.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {ReadonlySet<string>} blockedTypes puppeteer resource types to abort even on jobkorea.co.kr
 * @returns {Promise<{ pending(): string[]; failed(): string[] }>} the allowed requests that have
 *   not finished yet, to say what a stalled navigation was waiting for, and the page loads that
 *   failed with Chrome's error text, to say why a navigation ended on an error page
 */
export async function restrictToJobKorea(page, blockedTypes) {
  /** @type {Map<import('@cloudflare/puppeteer').HTTPRequest, string>} */
  const pending = new Map();
  /** @type {string[]} */
  const failed = [];
  await page.setRequestInterception(true);
  page.on('request', handleRequest(blockedTypes, pending));
  /** @param {import('@cloudflare/puppeteer').HTTPRequest} request */
  const settle = (request) => void pending.delete(request);
  page.on('requestfinished', settle);
  page.on('requestfailed', (request) => {
    settle(request);
    recordFailedDocument(request, failed);
  });
  return { pending: () => [...pending.values()], failed: () => [...failed] };
}

/**
 * Never throws, like handleRequest. Keeps at most five entries.
 * @param {import('@cloudflare/puppeteer').HTTPRequest} request
 * @param {string[]} failed
 */
function recordFailedDocument(request, failed) {
  try {
    if (request.resourceType() !== 'document' || failed.length >= 5) return;
    const reason = request.failure()?.errorText || 'failed';
    failed.push(`${request.method()} ${describe(request)} ${reason}`);
  } catch {
    // Intentionally ignored, see handleRequest.
  }
}
