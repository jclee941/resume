import {
  REMEMBER_API_URL,
  REMEMBER_CAREER_API_URL,
  REMEMBER_CAREER_URL,
  rememberRequest,
} from './remember-api.js';

/**
 * Application requirements the profile cannot answer on its own: postings that ask for any
 * of these need a human to fill in sensitive or file fields, so automation skips them.
 */
const UNANSWERABLE_REQUIREMENTS = [
  'portfolio',
  'birth_year',
  'gender',
  'military_service_status',
  'current_salary',
  'impairment_type',
  'eligibility_for_veterans_compensation',
];

/**
 * @typedef {{
 *   id: number;
 *   title?: string;
 *   status?: string;
 *   application_type?: string;
 *   job_description?: string;
 *   qualifications?: string;
 *   preferred_qualifications?: string;
 *   min_experience?: number | null;
 *   max_experience?: number | null;
 *   organization?: { name?: string } | null;
 *   addresses?: Array<{ address_level1?: string; address_level2?: string }>;
 *   application_requirements?: Record<string, boolean> | null;
 *   application?: unknown;
 * }} RememberPosting
 *
 * @typedef {{
 *   id: string;
 *   sourceId: string;
 *   company: string;
 *   position: string;
 *   url: string;
 *   sourceUrl: string;
 *   location: string;
 *   experience: string;
 *   description: string;
 * }} RememberJob
 */

/**
 * @param {string} keyword
 * @param {{ per?: number; token?: string | null; fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<RememberPosting[]>}
 */
export async function searchRememberPostings(keyword, { per = 20, token = null, fetchImpl } = {}) {
  const payload = await rememberRequest(token, `${REMEMBER_CAREER_API_URL}/job_postings/search`, {
    method: 'POST',
    body: { page: 1, per, search: { keywords: [keyword], include_applied_job_posting: false } },
    fetchImpl,
  });
  return Array.isArray(payload?.data) ? payload.data : [];
}

/**
 * A posting the profile alone can apply to: an open in-platform posting that asks for nothing
 * the profile cannot answer.
 * @param {RememberPosting} posting
 * @returns {boolean}
 */
export function isAutoApplicable(posting) {
  if (posting.status !== 'published' || posting.application_type !== 'apply') return false;
  const requirements = posting.application_requirements ?? {};
  return !UNANSWERABLE_REQUIREMENTS.some((field) => requirements[field] === true);
}

/**
 * @param {RememberPosting} posting
 * @returns {RememberJob}
 */
export function toRememberJob(posting) {
  const url = `${REMEMBER_CAREER_URL}/job/posting/${posting.id}`;
  const address = posting.addresses?.[0];
  const min = posting.min_experience;
  const max = posting.max_experience;
  return {
    id: `remember-${posting.id}`,
    sourceId: String(posting.id),
    company: posting.organization?.name ?? '',
    position: posting.title ?? '',
    url,
    sourceUrl: url,
    location: [address?.address_level1, address?.address_level2].filter(Boolean).join(' '),
    experience: min == null ? '' : `${min}-${max ?? min}년`,
    description: [posting.job_description, posting.qualifications, posting.preferred_qualifications]
      .filter(Boolean)
      .join('\n\n'),
  };
}

/**
 * @param {string} token
 * @param {string | number} postingId
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<unknown>} the account's application for the posting, null when none
 */
export async function getApplicationStatus(token, postingId, fetchImpl) {
  const url = `${REMEMBER_CAREER_API_URL}/job_postings/${postingId}/application_status`;
  return (await rememberRequest(token, url, { fetchImpl }))?.data ?? null;
}

/**
 * @param {string} token
 * @param {string | number} postingId
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string[]>} the fields the posting asks for that the profile lacks
 */
export async function getMissingApplicationFields(token, postingId, fetchImpl) {
  const url = `${REMEMBER_CAREER_API_URL}/job_postings/${postingId}/required_application_info`;
  const missing = (await rememberRequest(token, url, { fetchImpl }))?.data?.missing_fields;
  return Array.isArray(missing) ? missing.map(String) : [];
}

/**
 * The account contact the apply form is prefilled with.
 * @param {string} token
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ email: string; phone: string }>}
 */
export async function getAccountContact(token, fetchImpl) {
  const user = (await rememberRequest(token, `${REMEMBER_API_URL}/user.json`, { fetchImpl }))?.data
    ?.user;
  return { email: String(user?.email ?? ''), phone: String(user?.national_number ?? '') };
}

/**
 * Apply with the open profile, as the posting's confirm page does for "프로필로 지원".
 * @param {string} token
 * @param {string | number} postingId
 * @param {{ email: string; phone: string }} contact
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<unknown>}
 */
export async function applyWithProfile(token, postingId, contact, fetchImpl) {
  const url = `${REMEMBER_CAREER_API_URL}/job_postings/${postingId}/apply`;
  return rememberRequest(token, url, {
    method: 'POST',
    body: { phone: contact.phone, email: contact.email, source: 'profile' },
    fetchImpl,
  });
}
