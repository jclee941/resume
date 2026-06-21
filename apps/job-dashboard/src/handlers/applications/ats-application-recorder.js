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
  return {
    status: 'recorded',
    application: await repository.insert({ ...app, source, jobId: externalJobId || null, notes }),
  };
}
