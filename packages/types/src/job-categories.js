/**
 * Wanted Korea job-category numeric IDs.
 *
 * SSOT for both:
 *   1. Korean role-name → numeric ID (used by job-server CLI matching)
 *   2. canonical English key → numeric ID (used by Wanted API client)
 *
 * Pure data, no Node.js APIs — safe for Cloudflare Worker bundles.
 *
 * @type {Record<string, number>}
 */
export const JOB_CATEGORY_BY_NAME = Object.freeze({
  '보안운영 담당': 672,
  '보안 엔지니어': 672,
  보안엔지니어: 672,
  정보보안: 672,
  정보보호팀: 672,
  보안구축담당: 672,

  '인프라 엔지니어': 674,
  '인프라 담당': 674,
  DevOps: 674,
  SRE: 674,
  'SRE Engineer': 674,
  '클라우드 엔지니어': 674,

  '시스템 엔지니어': 665,
  '네트워크 엔지니어': 665,
  'IT지원/OA운영': 665,
  'IT 운영': 665,

  'Backend Developer': 872,
  '백엔드 개발자': 872,
  '서버 개발자': 872,
});

/**
 * Canonical short keys for Wanted job categories (for API call sites).
 * @type {Record<string, number>}
 */
export const JOB_CATEGORY_BY_KEY = Object.freeze({
  backend: 872,
  frontend: 669,
  fullstack: 873,
  devops: 674,
  data: 655,
  ml: 1634,
  security: 672,
  mobile: 677,
  ios: 678,
  android: 679,
  embedded: 658,
  qa: 676,
  dba: 10231,
  system: 665,
  pm: 876,
});

/** @type {number} */
export const DEFAULT_JOB_CATEGORY = 674;
