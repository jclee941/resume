import { buildPortfolioPayload, buildSavePayload, smartMergeFields } from './api-payload.js';
import { classifyError } from './api-errors.js';
import { createAPISession } from './api-session.js';
import { isJwtExpired } from './jwt-utils.js';

const DEFAULT_BASE_URL = 'https://www.jobkorea.co.kr';
const SAVE_ENDPOINT = '/User/Resume/Save';
const PORTFOLIO_ENDPOINT = '/User/Resume/AddUserFileDB';
const SESSION_CHECK_ENDPOINT = '/User/Resume/Edit';

function requestHeaders(cookieString, options = {}) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: `${DEFAULT_BASE_URL}/User/Resume/Edit${options.rNo ? `?RNo=${options.rNo}` : ''}`,
    Accept: 'application/json, text/javascript, */*',
    Origin: DEFAULT_BASE_URL,
  };

  if (options.userAgent) {
    headers['User-Agent'] = options.userAgent;
  }

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
    this.rNo = options.rNo || process.env.JOBKOREA_RNO || '';
    this.userAgent = options.userAgent || '';
  }

  setCookies(cookieString) {
    this.session.cookieString = cookieString || '';
  }

  async fetchEditPageTokens() {
    const response = await fetch(`${this.baseUrl}${SESSION_CHECK_ENDPOINT}?RNo=${this.rNo}`, {
      method: 'GET',
      headers: requestHeaders(this.session.getCookieHeader(), {
        rNo: this.rNo,
        userAgent: this.userAgent,
      }),
    });
    const html = await response.text();

    const isEditPageMatch = html.match(/\bname=["']IsEditPage["'][^>]*\bvalue=["']([^"']*)["']/i);
    const lastEditMatch = html.match(/\bname=["']LastEditDateTicks["'][^>]*\bvalue=["']([^"']*)["']/i);

    return {
      IsEditPage: isEditPageMatch ? isEditPageMatch[1] : 'True',
      IsCompleteSave: 'True',
      LastEditDateTicks: lastEditMatch ? lastEditMatch[1] : '',
    };
  }



  async saveResume(formFields, options = {}) {
    const url = endpointUrl(this.baseUrl, SAVE_ENDPOINT);
    url.searchParams.set('_', String(Date.now()));

    const tokens = options.tokens || (await this.fetchEditPageTokens());
    const baseFields = options.baseFields || [];
    const mergedFields = smartMergeFields(baseFields, formFields, tokens);

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders(this.session.getCookieHeader(), {
        rNo: this.rNo,
        userAgent: this.userAgent,
      }),
      body: buildSavePayload(mergedFields),
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
      headers: requestHeaders(this.session.getCookieHeader(), {
        rNo: this.rNo,
        userAgent: this.userAgent,
      }),
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
    const cookieString = this.session.getCookieHeader();
    if (isJwtExpired(cookieString)) {
      return { valid: false, reason: 'jwt_expired' };
    }

    const response = await fetch(endpointUrl(this.baseUrl, SESSION_CHECK_ENDPOINT), {
      method: 'GET',
      headers: requestHeaders(cookieString, {
        rNo: this.rNo,
        userAgent: this.userAgent,
      }),
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

  async fetchEditPageBaseFields() {
    const response = await fetch(`${this.baseUrl}${SESSION_CHECK_ENDPOINT}?RNo=${this.rNo}`, {
      method: 'GET',
      headers: requestHeaders(this.session.getCookieHeader(), {
        rNo: this.rNo,
        userAgent: this.userAgent,
      }),
    });
    const html = await response.text();

    const baseFields = [];
    const inputRegex = /<input[^>]*name=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
      const tag = match[0];
      const name = match[1];
      const valueMatch = tag.match(/\bvalue=["']([^"]*)["']/i);
      const value = valueMatch ? valueMatch[1] : '';
      baseFields.push({ name, value });
    }

    const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>[\s\S]*?<\/select>/gi;
    while ((match = selectRegex.exec(html)) !== null) {
      const name = match[1];
      const selectedMatch = match[0].match(/<option[^>]*\bselected\b[^>]*\bvalue=["']([^"]*)["']/i);
      const value = selectedMatch ? selectedMatch[1] : '';
      baseFields.push({ name, value });
    }

    const textareaRegex = /<textarea[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi;
    while ((match = textareaRegex.exec(html)) !== null) {
      baseFields.push({ name: match[1], value: match[2] });
    }

    return baseFields;
  }
}