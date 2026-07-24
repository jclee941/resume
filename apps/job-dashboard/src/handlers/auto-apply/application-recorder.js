export async function insertApplicationRecord(
  db,
  { canonicalParams, currentParams, legacyParams }
) {
  try {
    await insertWithAutoApplyMetadata(db, currentParams);
    return;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
  }

  try {
    await insertWithCanonicalUrl(db, canonicalParams);
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    await insertLegacy(db, legacyParams);
  }
}

async function insertWithAutoApplyMetadata(db, params) {
  await db
    .prepare(
      `INSERT INTO applications
        (
          id, job_id, source, source_url, canonical_url, position, company, location, match_score,
          status, priority, notes, created_at, updated_at, applied_at,
          auto_apply_run_id, auto_apply_dry_run, auto_apply_action, adapter_backed,
          decision_trace, approval_metadata, apply_result
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_url = excluded.source_url,
          canonical_url = excluded.canonical_url,
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at,
          notes = excluded.notes,
          auto_apply_run_id = excluded.auto_apply_run_id,
          auto_apply_dry_run = excluded.auto_apply_dry_run,
          auto_apply_action = excluded.auto_apply_action,
          adapter_backed = excluded.adapter_backed,
          decision_trace = excluded.decision_trace,
          approval_metadata = excluded.approval_metadata,
          apply_result = excluded.apply_result`
    )
    .bind(...params)
    .run();
}

async function insertWithCanonicalUrl(db, params) {
  await db
    .prepare(
      `INSERT INTO applications
        (id, job_id, source, source_url, canonical_url, position, company, location, match_score, status, priority, notes, created_at, updated_at, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_url = excluded.source_url,
          canonical_url = excluded.canonical_url,
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at`
    )
    .bind(...params)
    .run();
}

async function insertLegacy(db, params) {
  await db
    .prepare(
      `INSERT INTO applications
        (id, job_id, source, source_url, position, company, location, match_score, status, priority, notes, created_at, updated_at, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_url = excluded.source_url,
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at`
    )
    .bind(...params)
    .run();
}

function isMissingColumn(error) {
  const message = String(error?.message || error);
  return /no such column|has no column named|unknown column/i.test(message);
}
