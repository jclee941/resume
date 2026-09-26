/**
 * @typedef {{
 *   generateCoverLetter: boolean;
 *   checkApproval: boolean;
 *   submit: boolean;
 *   track: boolean;
 * }} StageState
 */

/**
 * @typedef {{
 *   id?: string | number;
 *   job_id?: string | number;
 *   source?: string;
 *   company?: string;
 *   position?: string;
 *   matchScore?: number;
 *   matchPercentage?: number;
 *   matchType?: string;
 *   [key: string]: unknown;
 * }} StageJob
 */

/**
 * @typedef {{
 *   id: string;
 *   [key: string]: unknown;
 * }} TrackedApplicationRecord
 */

/**
 * @typedef {{
 *   config: { reviewThreshold: number };
 *   tracker: {
 *     startTracking(job: StageJob, score: number): Promise<TrackedApplicationRecord>;
 *     recordScoring(id: string, score: number, matchType: string): Promise<unknown>;
 *     recordCoverLetter(id: string, coverLetter: string): Promise<unknown>;
 *   };
 *   retryService: {
 *     execute<T>(fn: () => Promise<T>, options?: { serviceName?: string }): Promise<T>;
 *   };
 *   coverLetterService: {
 *     generateForJob(job: StageJob): Promise<{ coverLetter?: string; cached?: boolean }>;
 *   };
 *   repository: {
 *     update(id: string, data: { cover_letter: string | null; notes: string }): Promise<unknown>;
 *   };
 * }} StageAutoApplier
 */

/**
 * @returns {StageState}
 */
export function createInitialStageState() {
  return {
    generateCoverLetter: false,
    checkApproval: false,
    submit: false,
    track: false,
  };
}

/**
 * @param {StageJob} job
 * @returns {number}
 */
export function getJobScore(job) {
  return Number(job.matchScore ?? job.matchPercentage ?? 0);
}

/**
 * @param {StageJob} job
 * @returns {string}
 */
export function getJobIdentifier(job) {
  return String(job.id ?? job.job_id ?? `${job.source}:${job.company}:${job.position}`);
}

/**
 * @param {StageAutoApplier} autoApplier
 * @param {StageJob} job
 * @param {number} score
 * @param {StageState} stageState
 * @returns {Promise<TrackedApplicationRecord>}
 */
export async function trackAndScoreJob(autoApplier, job, score, stageState) {
  const trackedApplication = await autoApplier.tracker.startTracking(job, score);
  stageState.track = true;

  await autoApplier.tracker.recordScoring(trackedApplication.id, score, job.matchType || 'hybrid');

  return trackedApplication;
}

/**
 * @param {StageAutoApplier} autoApplier
 * @param {StageJob} job
 * @param {number} score
 * @param {TrackedApplicationRecord} trackedApplication
 * @param {StageState} stageState
 * @returns {Promise<string | null>}
 */
export async function maybeGenerateCoverLetter(
  autoApplier,
  job,
  score,
  trackedApplication,
  stageState
) {
  if (score < autoApplier.config.reviewThreshold) {
    return null;
  }

  stageState.generateCoverLetter = true;
  const generated = await autoApplier.retryService.execute(
    async () => await autoApplier.coverLetterService.generateForJob(job),
    { serviceName: 'cover-letter-generation' }
  );

  const coverLetter = generated?.coverLetter || null;
  await autoApplier.tracker.recordCoverLetter(trackedApplication.id, coverLetter || '');
  await autoApplier.repository.update(trackedApplication.id, {
    cover_letter: coverLetter,
    notes: generated?.cached ? 'Cover letter loaded from cache' : 'Cover letter generated',
  });

  return coverLetter;
}

/**
 * @this {{ repository: { findTodayApplications(): Promise<Array<{ company?: string; position?: string }>> } }}
 * @returns {Promise<Set<string>>}
 */
export async function getExistingJobKeys() {
  const todayApplications = await this.repository.findTodayApplications();
  const keys = new Set();
  for (const app of todayApplications) {
    const company = String(app.company || '')
      .toLowerCase()
      .trim();
    const position = String(app.position || '')
      .toLowerCase()
      .trim();
    if (company || position) {
      keys.add(`${company}:${position}`);
    }
  }
  return keys;
}
