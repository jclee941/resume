import {
  SINGLE_WORKER_PROFILE_SYNC_PATH,
  SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN,
} from './constants.js';

/**
 * @param {Request} request
 * @returns {Promise<Request>}
 */
async function createSingleWorkerProfileSyncRequest(request) {
  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const normalizedPlatforms =
    Array.isArray(body.platforms) && body.platforms.length > 0
      ? body.platforms
      : ['wanted', 'jobkorea'];

  const payload = {
    ...body,
    platforms: normalizedPlatforms,
  };

  const targetUrl = new URL(request.url);
  targetUrl.pathname = '/api/automation/profile-sync';

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');

  return new Request(targetUrl.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * @param {Request} request
 * @param {string} syncId
 * @returns {Request}
 */
function createSingleWorkerProfileSyncStatusRequest(request, syncId) {
  const targetUrl = new URL(request.url);
  targetUrl.pathname = `/api/automation/profile-sync/${syncId}`;

  return new Request(targetUrl.toString(), {
    method: 'GET',
    headers: new Headers(request.headers),
  });
}

/**
 * @param {string} pathname
 * @param {string} method
 * @returns {boolean}
 */
function isSingleWorkerProfileSyncTrigger(pathname, method) {
  return pathname === SINGLE_WORKER_PROFILE_SYNC_PATH && method === 'POST';
}

/**
 * @param {string} pathname
 * @param {string} method
 * @returns {string | null}
 */
function getSingleWorkerProfileSyncStatusId(pathname, method) {
  if (method !== 'GET') {
    return null;
  }

  const match = pathname.match(SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN);
  return match ? match[1] : null;
}

export {
  createSingleWorkerProfileSyncRequest,
  createSingleWorkerProfileSyncStatusRequest,
  getSingleWorkerProfileSyncStatusId,
  isSingleWorkerProfileSyncTrigger,
};
