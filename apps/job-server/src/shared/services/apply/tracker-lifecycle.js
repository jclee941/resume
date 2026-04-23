import {
  normalizeCoverLetterValue,
  normalizeJob,
  normalizeMatchScore,
} from './tracker-normalizers.js';

export async function startTracking({ repository }, job, matchScore = 0) {
  const normalizedJob = normalizeJob(job);

  const created = await repository.create({
    job_id: normalizedJob.jobId,
    source: normalizedJob.source,
    source_url: normalizedJob.sourceUrl,
    position: normalizedJob.position,
    company: normalizedJob.company,
    location: normalizedJob.location,
    match_score: normalizeMatchScore(matchScore),
    status: 'discovered',
    priority: normalizedJob.priority,
    notes: 'Application discovered and tracking started',
  });

  return created;
}

export async function recordSearch({ repository, logger }, jobs = [], stats = {}) {
  const result = {
    searched: Array.isArray(jobs) ? jobs.length : 0,
    tracked: 0,
    duplicates: 0,
    failed: 0,
    stats,
  };

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return result;
  }

  for (const job of jobs) {
    const normalized = normalizeJob(job);

    try {
      const existing = normalized.jobId ? await repository.findByJobId(normalized.jobId) : [];
      if (existing.length > 0) {
        result.duplicates += 1;
        continue;
      }

      const score = normalizeMatchScore(job?.matchScore ?? job?.matchPercentage ?? 0);
      await startTracking({ repository }, job, score);
      result.tracked += 1;
    } catch (error) {
      result.failed += 1;
      logger.warn('[ApplicationTrackerService] Failed to track searched job', {
        jobId: normalized.jobId,
        error: error?.message,
      });
    }
  }

  return result;
}

export async function recordScoring(
  { repository, findByApplicationOrJobId, transitionStatus },
  jobId,
  score,
  type = 'rule'
) {
  const application = await findByApplicationOrJobId(jobId);
  const nextScore = normalizeMatchScore(score);

  await repository.update(application.id, {
    match_score: nextScore,
    notes: `Scoring updated (${type}) → ${nextScore}`,
  });

  return transitionStatus(application.id, 'scored', `Scoring recorded (${type})`);
}

export async function recordCoverLetter(
  { repository, coverLetterService, findByApplicationOrJobId, transitionStatus },
  jobId,
  coverLetter
) {
  const application = await findByApplicationOrJobId(jobId);
  const letter = normalizeCoverLetterValue(coverLetter);

  await repository.update(application.id, {
    cover_letter: letter,
    notes: 'Cover letter generated',
  });

  if (coverLetterService?.cache && application.job_id) {
    await coverLetterService.cache(application.job_id, letter);
  }

  return transitionStatus(application.id, 'cover_letter_generated', 'Cover letter generated');
}

export async function recordSubmission(
  { repository, findByApplicationOrJobId, transitionStatus },
  jobId,
  result = {}
) {
  const application = await findByApplicationOrJobId(jobId);
  const note = result?.message ?? result?.error ?? 'Submission attempted';

  await repository.update(application.id, {
    notes: note,
    source_url: result?.sourceUrl ?? application.source_url,
  });

  return transitionStatus(application.id, 'submitted', note);
}

export async function recordApprovalRequest(
  { findByApplicationOrJobId, transitionStatus },
  jobId
) {
  const application = await findByApplicationOrJobId(jobId);
  return transitionStatus(application.id, 'approval_requested', 'Approval requested');
}

export async function recordApproval(
  { findByApplicationOrJobId, transitionStatus },
  jobId,
  approved,
  reviewer = 'system'
) {
  const application = await findByApplicationOrJobId(jobId);
  const approvedFlag = Boolean(approved);
  const status = approvedFlag ? 'approved' : 'rejected';
  const note = `Approval ${status} by ${reviewer}`;

  return transitionStatus(application.id, status, note);
}

export async function recordCompletion(
  { repository, findByApplicationOrJobId, transitionStatus },
  jobId,
  status = 'completed',
  notes = ''
) {
  const application = await findByApplicationOrJobId(jobId);

  await repository.update(application.id, {
    notes: notes || application.notes,
  });

  return transitionStatus(application.id, status, notes || 'Application lifecycle completed');
}
