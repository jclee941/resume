import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';

/**
 * @typedef {Object} AtsApplicationInput
 * @property {string} [id]
 * @property {string} [source]
 * @property {string} [externalJobId]
 * @property {string} [jobId]
 * @property {string} [payloadHash]
 * @property {string} [approvalId]
 * @property {string} [notes]
 * @property {string} [sourceUrl]
 * @property {string} [source_url]
 * @property {string} [url]
 * @property {string} [jobUrl]
 * @property {string} [job_url]
 * @property {string} [position]
 * @property {string} [company]
 * @property {string} [location]
 * @property {number} [matchScore]
 * @property {string} [status]
 * @property {number} [priority]
 * @property {string} [resumeId]
 * @property {string} [coverLetter]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} AtsDatabase
 * @property {(query: string) => { bind(...values: unknown[]): { first(): Promise<unknown> } }} prepare
 */

/**
 * @param {{ db: AtsDatabase, insert: (app: Record<string, unknown>) => Promise<unknown> }} repository
 * @param {AtsApplicationInput} app
 * @returns {Promise<{ status: string, application: unknown }>}
 */
export async function recordAtsApplication(repository, app) {
  const source = String(app?.source || '').trim();
  const externalJobId = String(app?.externalJobId || app?.jobId || '').trim();
  const payloadHash = String(app?.payloadHash || '').trim();
  const approvalId = String(app?.approvalId || '').trim();
  if (!source || (!externalJobId && !payloadHash && !approvalId)) {
    throw new Error('ATS application requires source and dedupe key');
  }

  const payloadMarker = `ats_payload_hash:${payloadHash}`;
  const approvalMarker = `ats_approval_id:${approvalId}`;
  const existing = await repository.db
    .prepare(
      "SELECT * FROM applications WHERE source = ? AND ((job_id = ? AND ? IS NOT NULL) OR (instr(COALESCE(notes, ''), ?) > 0 AND ? IS NOT NULL) OR (instr(COALESCE(notes, ''), ?) > 0 AND ? IS NOT NULL)) ORDER BY created_at DESC LIMIT 1"
    )
    .bind(
      source,
      externalJobId || null,
      externalJobId || null,
      payloadMarker,
      payloadHash || null,
      approvalMarker,
      approvalId || null
    )
    .first();
  if (existing) return { status: 'already-applied', application: existing };

  const notes = [app.notes, payloadHash && payloadMarker, approvalId && approvalMarker]
    .filter(Boolean)
    .join('\n');
  const sourceUrl = app.sourceUrl || app.source_url || app.url || app.jobUrl || app.job_url || null;
  return {
    status: 'recorded',
    application: await repository.insert({
      ...app,
      source,
      sourceUrl,
      canonicalUrl: canonicalizeJobUrl(sourceUrl),
      jobId: externalJobId || null,
      notes,
    }),
  };
}
