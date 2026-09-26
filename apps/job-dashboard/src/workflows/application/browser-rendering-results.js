/**
 * @typedef {Object} RenderControl
 * @property {boolean} [disabled]
 * @property {string} text
 */

/**
 * @typedef {Object} PageState
 * @property {RenderControl[]} controls
 * @property {string} [visibleAction]
 * @property {boolean} [networkWrite]
 */

/**
 * @typedef {Object} ResponseLike
 * @property {() => number} [status]
 */

const APPLY_TEXT_PATTERN = /(즉시지원|입사지원|지원하기|apply|easy apply)/i;
const ALREADY_APPLIED_PATTERN = /(지원완료|이미\s*지원|입사지원\s*완료|already\s+applied)/i;
const COMPLETE_TEXT_PATTERN =
  /(지원이\s*완료|입사지원이\s*완료|제출.*완료|submitted|application\s+sent)/i;
const CONFIRM_TEXT_PATTERN = /(제출|최종지원|입사지원|지원하기|확인|submit|confirm)/i;
const CANCEL_TEXT_PATTERN = /(취소|닫기|close|cancel)/i;
const LOGIN_TEXT_PATTERN = /(로그인|sign\s*in|log\s*in)/i;

/**
 * @param {string} [bodyText]
 */
export function detectCompletion(bodyText = '') {
  if (ALREADY_APPLIED_PATTERN.test(bodyText)) {
    return { complete: true, alreadyApplied: true, status: 'already_applied' };
  }
  if (COMPLETE_TEXT_PATTERN.test(bodyText)) {
    return { complete: true, alreadyApplied: false, status: 'submitted' };
  }
  return { complete: false, alreadyApplied: false, status: 'unconfirmed' };
}

/**
 * @param {PageState} pageState
 * @returns {RenderControl | undefined}
 */
export function findApplyControl(pageState) {
  return pageState.controls.find(
    (control) => !control.disabled && APPLY_TEXT_PATTERN.test(control.text)
  );
}

/**
 * @param {PageState} pageState
 * @returns {RenderControl | undefined}
 */
export function findConfirmControl(pageState) {
  return pageState.controls.find(
    (control) =>
      !control.disabled &&
      CONFIRM_TEXT_PATTERN.test(control.text) &&
      !CANCEL_TEXT_PATTERN.test(control.text)
  );
}

/**
 * @param {string} status
 * @param {Record<string, unknown>} details
 */
export function completedResult(status, details) {
  return {
    ...details,
    success: true,
    error: null,
    status,
    browserRendered: true,
    requiresBrowserRendering: false,
    requiresJobServer: false,
    requiresBrowserAutomation: false,
    networkWrite: status !== 'already_applied',
  };
}

/**
 * @param {string} platform
 * @param {string} targetUrl
 * @param {string} finalUrl
 * @param {string} title
 * @param {ResponseLike | null | undefined} response
 * @param {number} cookieCount
 * @param {PageState} pageState
 */
export function renderedReviewResult(
  platform,
  targetUrl,
  finalUrl,
  title,
  response,
  cookieCount,
  pageState
) {
  const applyControl = findApplyControl(pageState);
  const loginControl = pageState.controls.find((control) => LOGIN_TEXT_PATTERN.test(control.text));
  return {
    success: false,
    platform,
    targetUrl,
    finalUrl,
    title,
    cookieCount,
    httpStatus: response?.status?.() ?? 0,
    visibleAction: pageState.visibleAction || applyControl?.text || loginControl?.text || '',
    networkWrite: pageState.networkWrite === true,
    error: applyControl
      ? 'Cloudflare Browser Rendering could not confirm the final application state.'
      : 'Cloudflare Browser Rendering opened the application page but could not confirm an apply action.',
    status: applyControl ? 'apply-button-detected' : loginControl ? 'login-required' : 'rendered',
    browserRendered: true,
    requiresBrowserRendering: true,
    requiresJobServer: false,
    requiresBrowserAutomation: false,
  };
}
