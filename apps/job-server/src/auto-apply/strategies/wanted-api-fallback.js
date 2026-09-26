import { APPLICATION_STATUS } from '../application-manager.js';
import { notifications } from '../../shared/services/notifications/index.js';
import { WANTED_PLATFORM } from './wanted-id.js';
import { extractApplicationId } from './wanted-applications.js';
import { getErrorStatus, isAlreadyAppliedWantedError, sleep } from './wanted-retry.js';

/**
 * @typedef {Object} CircuitState
 * @property {number} failures
 * @property {number} threshold
 * @property {number} openedAt
 * @property {number} resetMs
 */

/**
 * @typedef {Object} ApiFallbackJob
 * @property {string | number} [id]
 * @property {string} company
 * @property {string} title
 * @property {string} sourceUrl
 * @property {string} [source]
 */

/**
 * @typedef {Object} ApiFallbackContext
 * @property {{
 *   recordApplyRetryMetric?: (param: { attempt: number; status: number }) => void
 * }} [statsService]
 * @property {{
 *   recordRetryMetric?: (param: { attempt: number; status: number }) => void,
 *   addApplication: (job: ApiFallbackJob, opts: { resumeKey: string; notes: string }) => { id: string; [key: string]: unknown },
 *   updateStatus: (id: string, status: string, notes: string) => void
 * }} appManager
 */

/**
 * @typedef {Object} WantedFallbackApi
 * @property {(path: string, options: { method: string; body: unknown }) => Promise<import('./wanted-applications.js').ApplicationIdContainer>} chaosRequest
 */

/**
 * @typedef {Object} WantedApiFallbackParams
 * @property {ApiFallbackContext} ctx
 * @property {WantedFallbackApi} api
 * @property {ApiFallbackJob} job
 * @property {unknown} payload
 * @property {string} resumeKey
 * @property {import('./wanted-retry.js').RetryReporter} retryReporter
 * @property {CircuitState} circuitState
 */

/**
 * @param {WantedApiFallbackParams} params
 */
export async function applyViaWantedApiFallback({
  ctx,
  api,
  job,
  payload,
  resumeKey,
  retryReporter,
  circuitState,
}) {
  if (circuitState.failures >= circuitState.threshold) {
    if (Date.now() - circuitState.openedAt < circuitState.resetMs) {
      return {
        success: false,
        applicationId: null,
        error: 'Circuit is open — too many consecutive failures',
        retryable: false,
      };
    }

    circuitState.failures = 0;
  }

  let apiResult = null;
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      apiResult = await api.chaosRequest('/applications/v1', {
        method: 'POST',
        body: payload,
      });
      break;
    } catch (error) {
      if (
        isAlreadyAppliedWantedError(
          /** @type {import('./wanted-retry.js').WantedErrorLike} */ (error)
        )
      ) {
        return {
          success: true,
          applied: false,
          skipped: true,
          status: 'already_applied',
          applicationId: null,
          retryable: false,
        };
      }

      const status = getErrorStatus(
        /** @type {import('./wanted-retry.js').WantedErrorLike} */ (error)
      );
      if (status >= 500 && attempt < maxRetries) {
        retryReporter('retry', { attempt, error });
        ctx.statsService?.recordApplyRetryMetric?.({ attempt, status });
        ctx.appManager?.recordRetryMetric?.({ attempt, status });
        await sleep(500 * attempt);
        continue;
      }

      circuitState.failures += 1;
      if (circuitState.failures >= circuitState.threshold) {
        circuitState.openedAt = Date.now();
      }

      throw error;
    }
  }

  const applicationId = extractApplicationId(apiResult);
  circuitState.failures = 0;

  const application = ctx.appManager.addApplication(job, {
    resumeKey,
    notes: 'Auto-applied via Wanted API fallback',
  });

  ctx.appManager.updateStatus(
    application.id,
    APPLICATION_STATUS.APPLIED,
    'Auto-applied via Wanted API'
  );

  retryReporter('execution_success', { metrics: { successRate: 1 } });
  notifications
    .notifyApplySuccess(job.company, job.title, job.sourceUrl, WANTED_PLATFORM)
    .catch(() => {});

  return {
    success: true,
    applicationId: applicationId ?? application.id,
    application,
    retryable: false,
  };
}
