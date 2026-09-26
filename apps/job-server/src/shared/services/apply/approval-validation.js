import { AppError, ErrorCodes, ValidationError } from '../../errors/index.js';

/**
 * @param {{ applicationId?: unknown; application_id?: unknown; id?: unknown } | null | undefined} job
 * @returns {string}
 */
export function resolveApplicationId(job) {
  const applicationId = job?.applicationId || job?.application_id || job?.id;
  if (!applicationId || typeof applicationId !== 'string') {
    throw new ValidationError('job.applicationId (or id) is required', {
      fields: ['job.applicationId'],
    });
  }

  return applicationId;
}

/**
 * @param {{ status?: unknown } | null | undefined} request
 * @param {string} applicationId
 * @returns {void}
 */
export function assertPendingRequest(request, applicationId) {
  if (!request) {
    throw new AppError('Approval request not found', ErrorCodes.NOT_FOUND, 404, {
      applicationId,
    });
  }

  if (request.status !== 'pending') {
    throw new AppError('Approval request is not pending', ErrorCodes.VALIDATION, 409, {
      applicationId,
      status: request.status,
    });
  }
}
