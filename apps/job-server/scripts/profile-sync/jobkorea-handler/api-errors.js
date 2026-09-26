const CAPTCHA_RE = /보안인증|reCAPTCHA|자동가입 방지|비정상적인 접근|captcha/i;

/**
 * @typedef {object} JobKoreaSaveResult
 * @property {boolean} [IsSuccess]
 * @property {string} [ErrorMessage]
 */

/**
 * @typedef {object} JobKoreaApiResponse
 * @property {string} [url]
 * @property {string} [responseUrl]
 * @property {string} [body]
 * @property {string} [responseBody]
 * @property {number} [status]
 * @property {number} [statusCode]
 * @property {{ saveResult?: JobKoreaSaveResult }} [result]
 * @property {{ saveResult?: JobKoreaSaveResult }} [json]
 */

/**
 * @typedef {object} JobKoreaErrorOptions
 * @property {number} [statusCode]
 * @property {string} [responseBody]
 * @property {string} [endpoint]
 */

/**
 * @param {JobKoreaApiResponse | null | undefined} response
 * @returns {string}
 */
function responseUrl(response) {
  return response?.url || response?.responseUrl || '';
}

/**
 * @param {JobKoreaApiResponse | null | undefined} response
 * @returns {string}
 */
function responseBody(response) {
  return response?.responseBody ?? response?.body ?? '';
}

/**
 * @param {JobKoreaApiResponse | null | undefined} response
 * @returns {number}
 */
function responseStatus(response) {
  return response?.statusCode ?? response?.status ?? 0;
}

/**
 * @param {unknown} body
 * @returns {{ saveResult?: JobKoreaSaveResult } | null}
 */
function parseJsonBody(body) {
  if (!body || typeof body !== 'string') {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * @param {JobKoreaApiResponse | null | undefined} response
 * @returns {JobKoreaSaveResult | undefined}
 */
function saveResultFrom(response) {
  return (
    response?.result?.saveResult ??
    response?.json?.saveResult ??
    parseJsonBody(responseBody(response))?.saveResult
  );
}

class JobKoreaAPIError extends Error {
  /**
   * @param {string} [message]
   * @param {JobKoreaErrorOptions} [options={}]
   */
  constructor(message = '', options = {}) {
    super(message || 'JobKorea API request failed');
    this.name = 'JobKoreaAPIError';
    this.statusCode = options.statusCode ?? 0;
    this.responseBody = options.responseBody ?? '';
    this.endpoint = options.endpoint ?? '';
    this.failLoud = true;
  }
}

export class JobKoreaAuthError extends JobKoreaAPIError {
  /**
   * @param {string} [message='JobKorea session expired or invalid']
   * @param {JobKoreaErrorOptions} [options={}]
   */
  constructor(message = 'JobKorea session expired or invalid', options = {}) {
    super(message, options);
    this.name = 'JobKoreaAuthError';
  }
}

export class JobKoreaCaptchaError extends JobKoreaAPIError {
  /**
   * @param {string} [message='JobKorea CAPTCHA or verification challenge detected']
   * @param {JobKoreaErrorOptions} [options={}]
   */
  constructor(message = 'JobKorea CAPTCHA or verification challenge detected', options = {}) {
    super(message, options);
    this.name = 'JobKoreaCaptchaError';
  }
}

export class JobKoreaSaveError extends JobKoreaAPIError {
  /**
   * @param {string} [message='JobKorea resume save failed']
   * @param {JobKoreaErrorOptions} [options={}]
   */
  constructor(message = 'JobKorea resume save failed', options = {}) {
    super(message, options);
    this.name = 'JobKoreaSaveError';
  }
}

/**
 * @param {JobKoreaApiResponse | null | undefined} response
 * @param {string} [endpoint='']
 * @returns {JobKoreaAPIError}
 */
export function classifyError(response, endpoint = '') {
  const url = responseUrl(response);
  const body = responseBody(response);
  const statusCode = responseStatus(response);
  const baseOptions = { statusCode, responseBody: body, endpoint };

  if (/\/Login/i.test(url)) {
    return new JobKoreaAuthError('JobKorea session expired or invalid', baseOptions);
  }

  if (CAPTCHA_RE.test(body)) {
    return new JobKoreaCaptchaError(
      'JobKorea CAPTCHA or verification challenge detected',
      baseOptions
    );
  }

  const saveResult = saveResultFrom(response);
  if (saveResult?.IsSuccess === false) {
    return new JobKoreaSaveError(
      saveResult.ErrorMessage || 'JobKorea resume save failed',
      baseOptions
    );
  }

  return new JobKoreaAPIError(
    `JobKorea API request failed${statusCode ? ` (${statusCode})` : ''}`,
    baseOptions
  );
}
