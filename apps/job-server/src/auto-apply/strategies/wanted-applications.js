import { ValidationError } from '../../shared/errors/apply-errors.js';
import { WANTED_PLATFORM } from './wanted-id.js';

export function extractApplicationId(result) {
  return (
    result?.application_id ??
    result?.applicationId ??
    result?.id ??
    result?.data?.application_id ??
    result?.data?.applicationId ??
    result?.data?.id ??
    null
  );
}

export function normalizeApplicationEntries(response) {
  const candidates = [
    response?.applications,
    response?.results,
    response?.data?.applications,
    response?.data?.results,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function isAppliedJob(entry, targetJobId) {
  const postedJobId =
    entry?.job_id ??
    entry?.jobId ??
    entry?.position_id ??
    entry?.positionId ??
    entry?.job?.id ??
    null;

  return String(postedJobId) === String(targetJobId);
}

export async function resolveResumeKey(ctx, api, options = {}) {
  const explicitKey =
    options.resumeKey ??
    options.resume_key ??
    options.resumeId ??
    options.resume_id ??
    ctx?.config?.resumeKey ??
    ctx?.config?.resumeId;

  if (explicitKey) return explicitKey;

  const resumes = await api.chaosRequest('/resumes/v1?offset=0&limit=10');
  const resumeList = resumes?.data ?? (Array.isArray(resumes) ? resumes : []);

  if (!Array.isArray(resumeList) || resumeList.length === 0) {
    throw new ValidationError('No available resume found for Wanted application', {
      platform: WANTED_PLATFORM,
    });
  }

  const defaultResume = resumeList.find((resume) => resume.is_default) || resumeList[0];
  const resumeKey =
    defaultResume?.key ??
    defaultResume?.id ??
    defaultResume?.resume_id ??
    defaultResume?.uuid ??
    null;

  if (!resumeKey) {
    throw new ValidationError('Unable to resolve resume_key from Wanted profile', {
      platform: WANTED_PLATFORM,
    });
  }

  return resumeKey;
}
