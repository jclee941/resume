/**
 * @typedef {Object} D1Database
 * @property {(query: string) => { bind(...values: unknown[]): { first(): Promise<unknown> } }} prepare
 */

/**
 * @param {{ DB?: D1Database, JOB_DB?: D1Database } | null | undefined} env
 * @param {string | null | undefined} company
 * @returns {Promise<boolean>}
 */
export async function isCompanyAlreadyApplied(env, company) {
  const db = env?.DB || env?.JOB_DB;
  const normalizedCompany = normalizeCompany(company);
  if (!db || !normalizedCompany) return false;

  try {
    return await hasBlockingApplicationWithAutoApplyMetadata(db, normalizedCompany);
  } catch (error) {
    if (!isMissingAutoApplyColumn(error)) throw error;
    return hasBlockingLegacyApplication(db, normalizedCompany);
  }
}

/**
 * @param {D1Database} db
 * @param {string} normalizedCompany
 * @returns {Promise<boolean>}
 */
async function hasBlockingApplicationWithAutoApplyMetadata(db, normalizedCompany) {
  const result = await db
    .prepare(
      `SELECT id FROM applications
       WHERE lower(trim(company)) = lower(?)
         AND (
           status = 'applied'
           OR applied_at IS NOT NULL
           OR COALESCE(auto_apply_dry_run, 0) = 0
           OR auto_apply_action = 'saved_for_manual_apply'
         )
       LIMIT 1`
    )
    .bind(normalizedCompany)
    .first();

  return !!result;
}

/**
 * @param {D1Database} db
 * @param {string} normalizedCompany
 * @returns {Promise<boolean>}
 */
async function hasBlockingLegacyApplication(db, normalizedCompany) {
  const result = await db
    .prepare(
      `SELECT id FROM applications
       WHERE lower(trim(company)) = lower(?)
         AND (status = 'applied' OR applied_at IS NOT NULL)
       LIMIT 1`
    )
    .bind(normalizedCompany)
    .first();

  return !!result;
}

/**
 * @param {unknown} company
 * @returns {string}
 */
function normalizeCompany(company) {
  return typeof company === 'string' ? company.trim().replace(/\s+/g, ' ') : '';
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissingAutoApplyColumn(error) {
  const message =
    error && typeof error === 'object' && 'message' in error && error.message
      ? String(error.message)
      : String(error);
  return /no such column|has no column named|unknown column/i.test(message);
}
