export function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export function normalizeJob(job = {}) {
  return {
    jobId: job.id ?? job.job_id ?? job.jobId ?? null,
    source: job.source ?? job.platform ?? 'manual',
    sourceUrl: job.sourceUrl ?? job.source_url ?? job.url ?? null,
    position: job.position ?? job.title ?? 'Unknown Position',
    company: job.company ?? job.companyName ?? 'Unknown Company',
    location: job.location ?? null,
    priority: job.priority ?? job.applicationPriority ?? 'medium',
  };
}

export function normalizeMatchScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const score = Number(value);
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

export function normalizeCoverLetterValue(coverLetter) {
  if (!coverLetter) return '';
  if (typeof coverLetter === 'string') return coverLetter;
  if (typeof coverLetter.coverLetter === 'string') return coverLetter.coverLetter;
  return String(coverLetter);
}
