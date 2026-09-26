import {
  normalizeCoverLetterValue,
  normalizeJob,
  normalizeMatchScore,
} from './tracker-normalizers.js';

/**
 * @typedef {import('./tracker-normalizers.js').RawTrackerJob} RawTrackerJob
 * @typedef {import('./tracker-normalizers.js').NormalizedTrackerJob} NormalizedTrackerJob
 *
 * @typedef {{
 *   id: string;
 *   job_id?: string | number | null;
 *   notes?: string;
 *   source_url?: string | null;
 *   match_score?: number | null;
 *   cover_letter?: string | null;
 *   status?: string;
 *   [key: string]: unknown;
 * }} ApplicationEntity
 *
 * @typedef {{
 *   create(data: Record<string, unknown>): Promise<ApplicationEntity>;
 *   findByJobId(jobId: string | number): Promise<ApplicationEntity[]>;
 *   update(id: string, updates: Record<string, unknown>): Promise<ApplicationEntity>;
 *   [key: string]: unknown;
 * }} ApplicationRepositoryLike
 *
 * @typedef {{
 *   warn(message: string, meta?: Record<string, unknown>): void;
 *   [key: string]: unknown;
 * }} TrackerLogger
 *
 * @typedef {{
 *   cache?(jobId: string | number, letter: string): Promise<unknown>;
 * }} CoverLetterServiceLike
 */

/**
 * @param {{ repository: ApplicationRepositoryLike }} context
 * @param {RawTrackerJob} job
 * @param {number} [matchScore=0]
 * @returns {Promise<ApplicationEntity>}
 */
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

/**
 * @param {{ repository: ApplicationRepositoryLike; logger: TrackerLogger }} context
 * @param {RawTrackerJob[]} [jobs=[]]
 * @param {Record<string, unknown>} [stats={}]
 * @returns {Promise<{ searched: number; tracked: number; duplicates: number; failed: number; stats: Record<string, unknown> }>}
 */
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
        error: /** @type {{ message?: string }} */ (error)?.message,
      });
    }
  }

  return result;
}

/**
 * @param {{
 *   repository: ApplicationRepositoryLike;
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @param {number} score
 * @param {string} [type='rule']
 * @returns {Promise<unknown>}
 */
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

/**
 * @param {{
 *   repository: ApplicationRepositoryLike;
 *   coverLetterService?: CoverLetterServiceLike | null;
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @param {string | { coverLetter?: unknown } | null | undefined} coverLetter
 * @returns {Promise<unknown>}
 */
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

/**
 * @param {{
 *   repository: ApplicationRepositoryLike;
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @param {{ message?: string; error?: string; sourceUrl?: string }} [result={}]
 * @returns {Promise<unknown>}
 */
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

/**
 * @param {{
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @returns {Promise<unknown>}
 */
export async function recordApprovalRequest({ findByApplicationOrJobId, transitionStatus }, jobId) {
  const application = await findByApplicationOrJobId(jobId);
  return transitionStatus(application.id, 'approval_requested', 'Approval requested');
}

/**
 * @param {{
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @param {unknown} approved
 * @param {string} [reviewer='system']
 * @returns {Promise<unknown>}
 */
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

/**
 * @param {{
 *   repository: ApplicationRepositoryLike;
 *   findByApplicationOrJobId: (id: string | number) => Promise<ApplicationEntity>;
 *   transitionStatus: (id: string, status: string, note?: string) => Promise<unknown>;
 * }} context
 * @param {string | number} jobId
 * @param {string} [status='completed']
 * @param {string} [notes='']
 * @returns {Promise<unknown>}
 */
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
