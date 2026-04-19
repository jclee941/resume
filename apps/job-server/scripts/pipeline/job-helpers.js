import {
  EXCLUDED_LOCATIONS,
  EXCLUDED_TITLE_WORDS,
  RELEVANT_MIN_SCORE,
  TITLE_KEYWORDS,
} from './constants.js';
import { summarizeError } from './logging.js';

export function isObjectLike(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function toText(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .join('\n');
  }

  return String(value || '').trim();
}

export function joinSections(...sections) {
  return sections
    .map((section) => toText(section))
    .filter(Boolean)
    .join('\n\n');
}

export function normalizeTitle(title) {
  return String(title || '').toLowerCase();
}

export function titleMatchesRelevantKeywords(title) {
  const normalized = normalizeTitle(title);
  return TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isProfileMismatch(job) {
  const title = normalizeTitle(job.title || job.position || '');
  const location = (job.location || job.fullLocation || '').toLowerCase();

  if (EXCLUDED_TITLE_WORDS.some((word) => title.includes(word))) return 'title_excluded';
  if (EXCLUDED_LOCATIONS.some((loc) => location.includes(loc))) return 'location_excluded';

  return null;
}

export function extractJobArray(payload) {
  const candidates = [payload?.data, payload?.jobs, payload?.results, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function normalizeApplications(response) {
  const candidates = [
    response?.applications,
    response?.results,
    response?.data?.applications,
    response?.data?.results,
    response?.data,
    response,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function resolveResumeKey(response) {
  const resumes = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];
  if (resumes.length === 0) return null;
  const preferred = resumes.find((resume) => resume?.is_default) || resumes[0];
  return preferred?.key || preferred?.id || preferred?.resume_id || preferred?.uuid || null;
}

export function extractAppliedJobIds(response) {
  const applications = normalizeApplications(response);
  const ids = new Set();
  for (const entry of applications) {
    const jobId =
      entry?.job_id ||
      entry?.jobId ||
      entry?.position_id ||
      entry?.positionId ||
      entry?.job?.id ||
      null;
    if (jobId != null) {
      ids.add(String(jobId));
    }
  }

  return ids;
}

export function filterRelevantJobs(scoredJobs, log) {
  return scoredJobs
    .filter((job) => {
      if (!job.titleMatched && job.score < RELEVANT_MIN_SCORE) return false;
      const mismatch = isProfileMismatch(job);
      if (mismatch) {
        log('excluded', { id: job.id, title: job.title, reason: mismatch });
        return false;
      }
      return true;
    })
    .sort((left, right) => right.score - left.score);
}

export function createPipelineFailure(error) {
  return {
    id: null,
    title: 'pipeline',
    company: 'pipeline',
    source: 'pipeline',
    error: summarizeError(error),
  };
}
