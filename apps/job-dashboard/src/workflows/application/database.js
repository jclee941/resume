export async function saveWorkflowState(ctx, workflow) {
  await ctx.env.DB.prepare(
    `
      INSERT INTO application_workflows (
        id, status, trigger_type, jobs_found, jobs_approved, jobs_applied,
        jobs_failed, started_at, completed_at, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        jobs_found = excluded.jobs_found,
        jobs_approved = excluded.jobs_approved,
        jobs_applied = excluded.jobs_applied,
        jobs_failed = excluded.jobs_failed,
        completed_at = excluded.completed_at,
        data = excluded.data,
        updated_at = datetime('now')
      `
  )
    .bind(
      workflow.id,
      workflow.status,
      workflow.triggerType,
      workflow.stats.jobsFound,
      workflow.stats.jobsApproved,
      workflow.stats.jobsApplied,
      workflow.stats.jobsFailed,
      workflow.startedAt,
      workflow.completedAt,
      JSON.stringify({ steps: workflow.steps, errors: workflow.errors })
    )
    .run();
}

export async function logWorkflowStep(ctx, workflowId, stepName, status, details = {}) {
  await ctx.env.DB.prepare(
    `
      INSERT INTO workflow_logs (
        id, workflow_id, step_name, status, details, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `
  )
    .bind(
      `${workflowId}-${stepName}-${Date.now()}`,
      workflowId,
      stepName,
      status,
      JSON.stringify(details)
    )
    .run();
}

export async function createApprovalRequest(ctx, workflowId, job, status, matchScore) {
  const requestId = `approval-${workflowId}-${job.id}`;

  await ctx.env.DB.prepare(
    `
      INSERT INTO approval_requests (
        id, workflow_id, job_id, job_title, company, platform,
        match_score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        updated_at = datetime('now')
      `
  )
    .bind(requestId, workflowId, job.id, job.position, job.company, job.source, matchScore, status)
    .run();

  return requestId;
}

export async function getApprovalStatus(ctx, requestId) {
  const result = await ctx.env.DB.prepare('SELECT status FROM approval_requests WHERE id = ?')
    .bind(requestId)
    .first();

  return result?.status || 'pending';
}

export async function recordApplication(
  ctx,
  { workflowId, jobId, platform, company, position, resumeId, coverLetter, matchScore }
) {
  const applicationId = `${workflowId}-${jobId}`;

  await ctx.env.DB.prepare(
    `
      INSERT INTO applications (
        id, workflow_id, job_id, source, company, position,
        match_score, status, resume_id, cover_letter, applied_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
  )
    .bind(
      applicationId,
      workflowId,
      jobId,
      platform,
      company,
      position,
      matchScore,
      'applied',
      resumeId,
      coverLetter
    )
    .run();
}

export async function getDailyApplicationCount(ctx, date) {
  const result = await ctx.env.DB.prepare(
    `
      SELECT COUNT(*) as count FROM applications
      WHERE date(applied_at) = ? AND status = 'applied'
      `
  )
    .bind(date)
    .first();

  return result?.count || 0;
}
