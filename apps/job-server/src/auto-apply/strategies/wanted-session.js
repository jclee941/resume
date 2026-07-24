import SessionManager from '../../shared/services/session/index.js';
import {
  extractApplicationId,
  isAppliedJob,
  normalizeApplicationEntries,
} from './wanted-applications.js';
import { WANTED_PLATFORM } from './wanted-id.js';
import { classifyWantedError } from './wanted-retry.js';

export async function validateSession() {
  const session = SessionManager.load(WANTED_PLATFORM);
  if (!session) {
    return {
      valid: false,
      error: 'Wanted session not found',
      retryable: false,
    };
  }

  const api = await SessionManager.getAPI(WANTED_PLATFORM);
  if (!api) {
    return {
      valid: false,
      error: 'Wanted session cookies are missing or expired',
      retryable: false,
    };
  }

  try {
    await api.getProfile();
    return { valid: true, api };
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      valid: false,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }
}

export async function getApplicationStatus(jobId) {
  const sessionValidation = await validateSession();
  if (!sessionValidation.valid) {
    return {
      success: false,
      applied: false,
      error: sessionValidation.error,
      retryable: sessionValidation.retryable,
    };
  }

  try {
    const response = await sessionValidation.api.getApplications({ limit: 100, page: 1 });
    const applications = normalizeApplicationEntries(response);
    const matched = applications.find((entry) => isAppliedJob(entry, jobId));

    return {
      success: true,
      applied: Boolean(matched),
      status: matched?.status ?? matched?.application_status ?? null,
      applicationId: extractApplicationId(matched),
      retryable: false,
    };
  } catch (error) {
    const normalizedError = classifyWantedError(error);
    return {
      success: false,
      applied: false,
      error: normalizedError.message,
      retryable: Boolean(normalizedError.retryable),
    };
  }
}
