/**
 * Korean company-name normalization shared across Wanted + JobKorea profile
 * sync paths. Single source of truth so all platforms apply identical
 * canonical-form matching.
 *
 * Closes P2 audit finding (MONOREPO_REVIEW_2026-04-29.md §3 P2-9):
 * `normalizeCompanyName` was previously duplicated in three places with
 * subtly different semantics.
 *
 * @module @resume/shared/normalize
 */

/**
 * Strip Korean corporation prefix/suffix forms that platforms inconsistently
 * include. Returns trimmed canonical company name.
 *
 * Handles:
 *   - `(주)아이티센 CTS` → `아이티센 CTS`
 *   - `아이티센 CTS(주)` → `아이티센 CTS`
 *   - `주식회사 ITCEN` → `ITCEN`
 *   - `ITCEN 주식회사` → `ITCEN`
 *   - empty / null / undefined → `''`
 *
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function normalizeCompanyName(name) {
  if (!name) return '';
  return String(name)
    .replace(/\(주\)/g, '')
    .replace(/주식회사/g, '')
    .trim();
}

export function normalizeCareerRole(role) {
  const normalized = String(role || '')
    .replace(/\s*담당$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.replace(/^보안운영(?=\s|$)/, '보안 운영');
}

export function normalizeWorkTypeForProfile(workType) {
  const normalized = String(workType || '').replace(/\s+/g, ' ').trim();
  if (/^정규직\s*\([^)]*파견[^)]*\)$/.test(normalized)) return '정규직';
  return normalized;
}
