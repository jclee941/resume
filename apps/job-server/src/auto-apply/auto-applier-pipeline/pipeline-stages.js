export function createInitialStageState() {
  return {
    generateCoverLetter: false,
    checkApproval: false,
    submit: false,
    track: false,
  };
}

export function getJobScore(job) {
  return Number(job.matchScore ?? job.matchPercentage ?? 0);
}

export function getJobIdentifier(job) {
  return String(job.id ?? job.job_id ?? `${job.source}:${job.company}:${job.position}`);
}

export async function trackAndScoreJob(autoApplier, job, score, stageState) {
  const trackedApplication = await autoApplier.tracker.startTracking(job, score);
  stageState.track = true;

  await autoApplier.tracker.recordScoring(trackedApplication.id, score, job.matchType || 'hybrid');

  return trackedApplication;
}

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
