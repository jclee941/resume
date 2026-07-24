import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';

export class WantedHistoryRepository {
  constructor(db) {
    this.db = db;
  }

  async upsertHistory(record) {
    await this.db
      .prepare(
        `
        INSERT INTO wanted_application_history (
          wanted_application_id,
          wanted_job_id,
          status,
          position,
          company,
          source_url,
          resume_id,
          applied_at,
          updated_at,
          raw_payload,
          synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(wanted_application_id) DO UPDATE SET
          wanted_job_id = excluded.wanted_job_id,
          status = excluded.status,
          position = excluded.position,
          company = excluded.company,
          source_url = excluded.source_url,
          resume_id = excluded.resume_id,
          applied_at = excluded.applied_at,
          updated_at = excluded.updated_at,
          raw_payload = excluded.raw_payload,
          synced_at = excluded.synced_at
      `
      )
      .bind(
        record.wantedApplicationId,
        record.wantedJobId,
        record.status,
        record.position,
        record.company,
        record.sourceUrl,
        record.resumeId,
        record.appliedAt,
        record.updatedAt,
        record.rawPayload,
        record.syncedAt
      )
      .run();
    return record;
  }

  async upsertApplication(record) {
    await this.db
      .prepare(
        `
        INSERT INTO applications (
          id,
          job_id,
          source,
          source_url,
          canonical_url,
          position,
          company,
          status,
          resume_id,
          notes,
          created_at,
          updated_at,
          applied_at
        )
        VALUES (?, ?, 'wanted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          job_id = excluded.job_id,
          source_url = excluded.source_url,
          canonical_url = excluded.canonical_url,
          position = excluded.position,
          company = excluded.company,
          status = excluded.status,
          resume_id = excluded.resume_id,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at
      `
      )
      .bind(
        record.id,
        record.wantedJobId,
        record.sourceUrl,
        canonicalizeJobUrl(record.sourceUrl),
        record.position,
        record.company,
        record.status,
        record.resumeId,
        `Synced from Wanted application ${record.wantedApplicationId}`,
        record.appliedAt,
        record.updatedAt,
        record.appliedAt
      )
      .run();
    return record;
  }
}
