import { buildPortfolioPayload, buildSavePayload } from './api-payload.js';
import { classifyError } from './api-errors.js';
import { createAPISession } from './api-session.js';

const DEFAULT_BASE_URL = 'https://www.jobkorea.co.kr';
const SAVE_ENDPOINT = '/User/Resume/Save';
const PORTFOLIO_ENDPOINT = '/User/Resume/AddUserFileDB';
const SESSION_CHECK_ENDPOINT = '/User/Resume/Edit';

function requestHeaders(cookieString) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: `${DEFAULT_BASE_URL}/User/Resume/Edit`,
    Accept: 'application/json, text/javascript, */*',
  };

  if (cookieString) {
    headers.Cookie = cookieString;
  }

  return headers;
}

function parseJson(rawResponse) {
  if (!rawResponse) {
    return {};
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    return {};
  }
}

function endpointUrl(baseUrl, endpoint) {
  return new URL(endpoint, baseUrl);
}

export class JobKoreaAPIClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.session = createAPISession(options.cookieString || '');
    this.logger = options.logger || console;
  }

  setCookies(cookieString) {
    this.session.cookieString = cookieString || '';
  }

  async saveResume(formFields) {
    const url = endpointUrl(this.baseUrl, SAVE_ENDPOINT);
    url.searchParams.set('_', String(Date.now()));

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders(this.session.getCookieHeader()),
      body: buildSavePayload(formFields),
    });
    const rawResponse = await response.text();
    const result = parseJson(rawResponse);

    this.throwIfInvalidResponse(response, SAVE_ENDPOINT, rawResponse, result);

    return {
      success: result?.saveResult?.IsSuccess === true,
      result,
      rawResponse,
    };
  }

  async registerPortfolio(url) {
    const response = await fetch(endpointUrl(this.baseUrl, PORTFOLIO_ENDPOINT), {
      method: 'POST',
      headers: requestHeaders(this.session.getCookieHeader()),
      body: buildPortfolioPayload(url),
    });
    const rawResponse = await response.text();
    const result = parseJson(rawResponse);

    this.throwIfInvalidResponse(response, PORTFOLIO_ENDPOINT, rawResponse, result);

    return {
      success: result?.sc === 1,
      fileIdx: Number.isFinite(result?.idx) ? result.idx : null,
      rawResponse,
    };
  }

  async checkSession() {
    const response = await fetch(endpointUrl(this.baseUrl, SESSION_CHECK_ENDPOINT), {
      method: 'GET',
      headers: requestHeaders(this.session.getCookieHeader()),
    });

    return { valid: !/\/Login/i.test(response.url || '') };
  }

  throwIfInvalidResponse(response, endpoint, rawResponse, result) {
    const errorContext = {
      url: response.url,
      statusCode: response.status,
      responseBody: rawResponse,
      result,
    };

    if (/\/Login/i.test(response.url || '') || !response.ok || /보안인증|reCAPTCHA|자동가입 방지|비정상적인 접근|captcha/i.test(rawResponse) || result?.saveResult?.IsSuccess === false) {
      throw classifyError(errorContext, endpoint);
    }
  }
}
