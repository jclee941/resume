import { ValidationError } from '../../shared/errors/apply-errors.js';
import SessionManager from '../../shared/services/session/session-manager.js';

export const WANTED_PLATFORM = 'wanted';

export function parseWantedJobId(jobId) {
  if (typeof jobId === 'number') {
    return Number.isSafeInteger(jobId) && jobId > 0 ? jobId : null;
  }

  if (typeof jobId !== 'string') {
    return null;
  }

  const match = /^(?:wanted_)?(\d+)$/.exec(jobId.trim());
  if (!match) {
    return null;
  }

  const numericJobId = Number(match[1]);
  return Number.isSafeInteger(numericJobId) && numericJobId > 0 ? numericJobId : null;
}

export function buildWantedJobUrl(jobId) {
  const numericJobId = parseWantedJobId(jobId);
  if (numericJobId === null) {
    return null;
  }
  return `https://www.wanted.co.kr/wd/${numericJobId}`;
}

export function buildApplicationPayload(job, options, resumeKey, profileData = {}) {
  const numericJobId = parseWantedJobId(job.id);
  if (numericJobId === null) {
    throw new ValidationError('Invalid Wanted job.id; expected a numeric ID or wanted_<numeric ID>', {
      platform: WANTED_PLATFORM,
      metadata: { jobId: job.id },
    });
  }

  const session = SessionManager.load(WANTED_PLATFORM) || {};
  const extraPayload = options.extraPayload ? { ...options.extraPayload } : {};

  return {
    ...extraPayload,
    email: session.email || options.email || '',
    username: profileData.name || options.username || session.username || '',
    mobile: profileData.mobile || options.mobile || session.mobile || '',
    job_id: numericJobId,
    resume_keys: resumeKey ? [resumeKey] : [],
    nationality_code: options.nationality_code || 'KR',
    visa: options.visa || null,
    status: 'apply',
  };
}
