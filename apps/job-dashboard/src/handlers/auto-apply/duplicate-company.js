/**
 * @typedef {Object} D1Database
 * @property {(query: string) => { all(): Promise<{ results?: Array<{ company?: unknown }> }> }} prepare
 */

/** Any real application row blocks its company (applied, rejected, in progress, ...); a plain
 * saved posting is a bookmark, not an application, so it does not. */
const BLOCKING_WITH_AUTO_APPLY_METADATA = `status = 'applied'
  OR applied_at IS NOT NULL
  OR (COALESCE(auto_apply_dry_run, 0) = 0 AND status != 'saved')
  OR auto_apply_action = 'saved_for_manual_apply'`;
const BLOCKING_LEGACY = "status = 'applied' OR applied_at IS NOT NULL";

/**
 * Whether the account already applied to this company. Platforms write one company differently
 * (Wanted "가나다(Ganada)", Remember "(주)가나다"), so names are compared by companyKey.
 * @param {{ JOB_DB?: D1Database } | null | undefined} env
 * @param {unknown} company
 * @returns {Promise<boolean>}
 */
export async function isCompanyAlreadyApplied(env, company) {
  const db = env?.JOB_DB;
  const key = companyKey(company);
  if (!db || !key) return false;

  let companies;
  try {
    companies = await blockingCompanies(db, BLOCKING_WITH_AUTO_APPLY_METADATA);
  } catch (error) {
    if (!isMissingAutoApplyColumn(error)) throw error;
    companies = await blockingCompanies(db, BLOCKING_LEGACY);
  }
  return companies.some((name) => companyKey(name) === key);
}

/**
 * @param {D1Database} db
 * @param {string} blockingCondition
 * @returns {Promise<unknown[]>}
 */
async function blockingCompanies(db, blockingCondition) {
  const { results = [] } = await db
    .prepare(`SELECT DISTINCT company FROM applications WHERE ${blockingCondition}`)
    .all();
  return results.map((row) => row.company);
}

/**
 * A company's name the same way every platform writes it: without parenthesized parts (the legal
 * form "(주)" or an English name), legal-form words, spacing and punctuation, in lower case.
 * @param {unknown} company
 * @returns {string}
 */
export function companyKey(company) {
  if (typeof company !== 'string') return '';
  return company
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/㈜|주식회사|유한회사/g, '')
    .replace(/[\s.,'·&_-]/g, '');
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
