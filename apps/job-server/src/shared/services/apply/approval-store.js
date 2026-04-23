function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

export async function upsertApprovalRequest(applicationRepository, {
  id,
  workflowId,
  jobId,
  jobTitle,
  company,
  platform,
  matchScore,
  notes,
  now,
}) {
  await applicationRepository.d1Client.query(
    `
      INSERT INTO approval_requests (
        id, workflow_id, job_id, job_title, company, platform,
        match_score, status, reviewed_by, reviewed_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        workflow_id = excluded.workflow_id,
        job_id = excluded.job_id,
        job_title = excluded.job_title,
        company = excluded.company,
        platform = excluded.platform,
        match_score = excluded.match_score,
        status = 'pending',
        reviewed_by = NULL,
        reviewed_at = NULL,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `,
    [id, workflowId, jobId, jobTitle, company, platform, matchScore, notes, now, now]
  );
}

export async function getApprovalRequestById(applicationRepository, applicationId) {
  const rows = await applicationRepository.d1Client.query(
    'SELECT * FROM approval_requests WHERE id = ? LIMIT 1',
    [applicationId]
  );

  return rows[0] || null;
}

export async function updateApprovalRequest(applicationRepository, applicationId, patch) {
  const allowedFields = {
    status: patch.status,
    reviewed_by: patch.reviewed_by,
    reviewed_at: patch.reviewed_at,
    notes: patch.notes,
    updated_at: patch.updated_at || toIso(),
  };

  const entries = Object.entries(allowedFields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return;
  }

  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(applicationId);

  await applicationRepository.d1Client.query(`UPDATE approval_requests SET ${setClause} WHERE id = ?`, values);
}

export async function markTimedOut(applicationRepository, request, now, timeoutHours, parseNotes, stringifyNotes) {
  const notesState = parseNotes(request.notes);
  notesState.reason = 'Timed out after approval window elapsed';
  notesState.events.push({ type: 'timeout', at: now });

  await updateApprovalRequest(applicationRepository, request.id, {
    status: 'timeout',
    reviewed_by: 'system:timeout',
    reviewed_at: now,
    notes: stringifyNotes(notesState),
    updated_at: now,
  });

  await applicationRepository.updateStatus(
    request.id,
    'rejected',
    `Auto-rejected after ${timeoutHours}h timeout`
  );

  await applicationRepository.update(request.id, { rejected_at: now });
}
