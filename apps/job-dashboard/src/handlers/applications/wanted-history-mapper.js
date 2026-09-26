import { APPLICATION_STATUS, VALID_STATUSES } from './statuses.js';

/**
 * @param {...unknown} values
 * @returns {string | null}
 */
function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return null;
}

/**
 * @param {unknown} status
 * @returns {string}
 */
function mapWantedStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (VALID_STATUSES.includes(normalized)) {
    return normalized;
  }
  if (normalized.includes('reject')) return APPLICATION_STATUS.REJECTED;
  if (normalized.includes('withdraw')) return APPLICATION_STATUS.WITHDRAWN;
  if (normalized.includes('interview')) return APPLICATION_STATUS.INTERVIEW;
  if (normalized.includes('offer') || normalized.includes('accept'))
    return APPLICATION_STATUS.OFFER;
  if (normalized.includes('view')) return APPLICATION_STATUS.VIEWED;
  if (normalized.includes('progress') || normalized.includes('screen')) {
    return APPLICATION_STATUS.IN_PROGRESS;
  }
  return APPLICATION_STATUS.APPLIED;
}

/**
 * @typedef {{
 *   applications?: Array<Record<string, unknown>>;
 *   data?: { applications?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
 *   [key: string]: unknown;
 * }} WantedPayloadObject
 *
 * @typedef {WantedPayloadObject | Array<Record<string, unknown>> | null | undefined} WantedPayload
 *
 * @typedef {{
 *   id?: string | number;
 *   application_id?: string | number;
 *   applicationId?: string | number;
 *   job_id?: string | number;
 *   jobId?: string | number;
 *   wd_id?: string | number;
 *   position?: string;
 *   title?: string;
 *   company_name?: string;
 *   company?: { name?: string };
 *   applied_at?: string;
 *   appliedAt?: string;
 *   created_at?: string;
 *   createdAt?: string;
 *   updated_at?: string;
 *   updatedAt?: string;
 *   status_updated_at?: string;
 *   statusUpdatedAt?: string;
 *   source_url?: string;
 *   sourceUrl?: string;
 *   status?: string;
 *   resume_id?: string | number;
 *   resumeId?: string | number;
 *   job?: {
 *     id?: string | number;
 *     position?: string;
 *     title?: string;
 *     company?: { name?: string };
 *     url?: string;
 *   };
 *   [key: string]: unknown;
 * }} WantedItem
 */

/**
 * @param {WantedPayload} payload
 * @returns {Array<Record<string, unknown>>}
 */
export function extractWantedApplications(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.applications)) return payload.data.applications;
  return [];
}

/**
 * @param {WantedItem} item
 * @param {string} [now]
 */
export function normalizeWantedApplication(item, now = new Date().toISOString()) {
  const wantedApplicationId = firstString(item.id, item.application_id, item.applicationId);
  const wantedJobId = firstString(item.job?.id, item.job_id, item.jobId, item.wd_id);

  if (!wantedApplicationId) {
    throw new TypeError('Wanted application history item is missing application id');
  }

  const position = firstString(item.job?.position, item.job?.title, item.position, item.title);
  const company = firstString(
    item.job?.company?.name,
    item.company?.name,
    item.company_name,
    item.company
  );
  const appliedAt =
    firstString(item.applied_at, item.appliedAt, item.created_at, item.createdAt) || now;
  const updatedAt =
    firstString(item.updated_at, item.updatedAt, item.status_updated_at, item.statusUpdatedAt) ||
    appliedAt;
  const sourceUrl =
    firstString(item.source_url, item.sourceUrl, item.job?.url) ||
    (wantedJobId ? `https://www.wanted.co.kr/wd/${wantedJobId}` : null);

  return {
    id: `wanted_${wantedApplicationId}`,
    wantedApplicationId,
    wantedJobId,
    sourceUrl,
    position: position || 'Unknown',
    company: company || 'Unknown',
    status: mapWantedStatus(item.status),
    resumeId: firstString(item.resume_id, item.resumeId),
    appliedAt,
    updatedAt,
    rawPayload: JSON.stringify(item),
    syncedAt: now,
  };
}
