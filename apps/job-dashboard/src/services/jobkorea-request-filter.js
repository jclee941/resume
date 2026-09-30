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
 * Never throws: a request that is already handled or a closed page must not fail the caller.
 * @param {ReadonlySet<string>} blockedTypes
 * @returns {(request: import('@cloudflare/puppeteer').HTTPRequest) => void}
 */
function handleRequest(blockedTypes) {
  return (request) => {
    try {
      const settled = shouldBlock(request, blockedTypes) ? request.abort() : request.continue();
      Promise.resolve(settled).catch(() => {});
    } catch {
      // Intentionally ignored, see above.
    }
  };
}

/**
 * Enables request interception on the page and confines it to jobkorea.co.kr.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {ReadonlySet<string>} blockedTypes puppeteer resource types to abort even on jobkorea.co.kr
 * @returns {Promise<void>}
 */
export async function restrictToJobKorea(page, blockedTypes) {
  await page.setRequestInterception(true);
  page.on('request', handleRequest(blockedTypes));
}
