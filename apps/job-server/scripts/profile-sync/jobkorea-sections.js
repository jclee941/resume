/**
 * JobKorea field mapping — sections currently covered:
 *   careers, school, licenses, awards, military, hopeJob, portfolio.
 *
 * SKILLS MAPPING — DEFERRED.
 * SSoT skills (29 entries) are NOT mapped to JobKorea form fields. The
 * JobKorea Edit form's skill-section field naming (likely `Skl_*`,
 * `Skill[cN].*` or `UserSkill[cN].*` based on JK conventions) is NOT
 * present anywhere in this codebase — git log returns 0 commits for
 * "jobkorea.*skill". Implementation requires a LIVE DOM probe of
 * https://www.jobkorea.co.kr/User/Resume/Edit?RNo=<rNo> with a valid
 * authenticated session to capture the actual form field names + the
 * "스킬" "기술" or equivalent section-add button label.
 *
 * Until then, JobKorea skills exposure relies on the free-text
 * `platformVariants.jobkorea.about` SSoT field (see resume_data.json), which
 * embeds skill keywords as prose. This is intentional, not an oversight.
 *
 * Tracked in: docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md (Issue A).
 *
 * To add skills mapping in the future:
 *   1. Probe live form for `Skl_*` / `Skill[*]` / `UserSkill[*]` fields
 *   2. Add `Skill` to section-slots.js sections[] + sectionLabels
 *   3. Add `mapSkillsToFormFields()` following mapLicensesToFormFields() pattern
 *   4. Add Skill patterns to change-detection.js KEY_FIELD_PATTERNS
 *   5. Wire into buildJobKoreaFormData()
 */
export { registerPortfolioUrl } from './jobkorea-sections/api-client.js';
export { buildJobKoreaFormData } from './jobkorea-sections/base.js';
export {
  GRAD_TYPE,
  JK_JOB_CATEGORY,
  JK_JOB_CODES,
  JK_LOCATION_CODES,
  MAJOR_TYPE,
  MILITARY_KIND,
  MILITARY_STAT,
  SCHOOL_TYPE,
  mapAwardToFormFields,
  mapCareersToFormFields,
  mapHopeJobToFormFields,
  mapLicensesToFormFields,
  mapMilitaryToFormFields,
  mapPortfolioToFormFields,
  mapSchoolToFormFields,
  normalizeCompanyName,
} from './jobkorea-sections/field-mappers.js';
export { parseRange, toYYYYMM } from './jobkorea-sections/validators.js';
