import { normalizeCareerRole } from './normalize/index.js';

/**
 * Job category ID mapping for Wanted Korea.
 *
 * This file contains only pure data constants with NO Node.js-specific APIs
 * (no fileURLToPath, process.env, path, etc.) so it can be safely imported
 * by Cloudflare Workers bundles.
 *
 * @see constants.js - re-exports these for CLI backward compatibility
 * @type {Record<string, number>}
 */
export const JOB_CATEGORY_MAPPING = {
  '보안운영 담당': 672,
  '보안 운영': 672,
  '보안 운영 엔지니어': 672,
  '보안 인프라 엔지니어': 672,
  '네트워크 보안 엔지니어': 672,
  '보안 엔지니어': 672,
  보안엔지니어: 672,
  정보보안: 672,
  정보보호팀: 672,
  보안구축담당: 672,

  '인프라 엔지니어': 674,
  '인프라 운영 엔지니어': 674,
  '인프라 담당': 674,
  DevOps: 674,
  SRE: 674,
  'SRE Engineer': 674,
  '클라우드 엔지니어': 674,

  '시스템 엔지니어': 665,
  '네트워크 엔지니어': 665,
  'IT지원/OA운영': 665,
  'IT/OA 운영 엔지니어': 665,
  'IT 운영': 665,

  'Backend Developer': 872,
  '백엔드 개발자': 872,
  '서버 개발자': 872,
};

/** @type {number} */
export const DEFAULT_JOB_CATEGORY = 674;

function getRoleCategoryCandidates(role) {
  const raw = String(role || '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeCareerRole(raw);
  return [...new Set([raw, normalized].filter(Boolean))];
}

export function hasJobCategoryMapping(role) {
  return getRoleCategoryCandidates(role).some((candidate) =>
    Object.hasOwn(JOB_CATEGORY_MAPPING, candidate)
  );
}

export function resolveJobCategoryId(role, fallback = DEFAULT_JOB_CATEGORY) {
  for (const candidate of getRoleCategoryCandidates(role)) {
    if (Object.hasOwn(JOB_CATEGORY_MAPPING, candidate)) return JOB_CATEGORY_MAPPING[candidate];
  }
  return fallback;
}
