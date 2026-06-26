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

function normalizeCompany(company) {
  return typeof company === 'string' ? company.trim().replace(/\s+/g, ' ') : '';
}

function isMissingAutoApplyColumn(error) {
  return /no such column|has no column named|unknown column/i.test(String(error?.message || error));
}
