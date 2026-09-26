import { redactSensitiveValue } from './har-redaction-patterns.js';

/**
 * @typedef {{
 *   name: string;
 *   value: string;
 * }} HarHeader
 *
 * @typedef {{
 *   name: string;
 *   value?: string;
 * }} HarQueryParam
 *
 * @typedef {{
 *   name: string;
 *   value?: string;
 *   [key: string]: unknown;
 * }} HarFieldEntry
 *
 * @typedef {{
 *   mimeType?: string;
 *   params?: HarFieldEntry[];
 *   text?: string;
 * }} HarPostData
 *
 * @typedef {{
 *   method?: string;
 *   url: string;
 *   headers?: HarHeader[];
 *   queryString?: HarQueryParam[];
 *   postData?: HarPostData;
 * }} HarRequest
 *
 * @typedef {{
 *   status?: number;
 *   headers?: HarHeader[];
 *   content?: {
 *     mimeType?: string;
 *     text?: string;
 *   };
 * }} HarResponse
 *
 * @typedef {{
 *   request: HarRequest;
 *   response?: HarResponse;
 * }} HarEntry
 *
 * @typedef {{
 *   log?: {
 *     entries?: HarEntry[];
 *   };
 * }} HarLog
 *
 * @typedef {{
 *   stripResponseContentText?: boolean;
 * }} SanitizeHarOptions
 */

const REDACTED = '[REDACTED]';
const TIMESTAMP_PARAM_NAMES = new Set(['_', 'timestamp', 'ts', 't']);

const SENSITIVE_POST_FIELD_PATTERNS = [
  /^M_ID$/i,
  /^M_PWD$/i,
  /(?:^|[._\]])(?:pwd|password|passwd)(?:$|[._[])/i,
  /(?:^|[._\]])(?:email|mail)(?:$|[._[])/i,
  /(?:^|[._\]])(?:phone|mobile|tel|cell|cellphone)(?:$|[._[])/i,
  /(?:^|[._\]])(?:addr|address|zip|zipcode|post)(?:$|[._[])/i,
  /(?:^|[._\]])(?:birth|birthday|birthdate|jumin|resident)(?:$|[._[])/i,
  /(?:^|[._\]])(?:m_name|user_name|member_name|kor_name|eng_name)(?:$|[._[])/i,
  /^(?:Name|UserName|M_Name)$/i,
  /(?:csrf|xsrf|token|session|auth|credential)/i,
];

const SENSITIVE_TEXT_PATTERNS = [
  /"(?:cookie|set-cookie|authorization)"\s*:\s*"(?!\[REDACTED\])[^"\n]+"/i,
  /(?:^|\n)(?:Cookie|Set-Cookie|Authorization):\s*(?!\[REDACTED\])[^\n]+/i,
  /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/,
  /\b\d{6}[-\s]?[1-4]\d{6}\b/,
  /(?:JSESSIONID|ASPSESSIONID|SESSION|AUTH_TOKEN|CSRF_TOKEN)=([^;\s]{4,})/i,
];

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @param {unknown} name
 * @returns {boolean}
 */
function isSensitivePostField(name) {
  return SENSITIVE_POST_FIELD_PATTERNS.some((pattern) => pattern.test(String(name ?? '')));
}

/**
 * @param {string} rawUrl
 * @returns {string}
 */
function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const url = new URL(rawUrl);
    const replacements = [];
    for (const [name, value] of [...url.searchParams.entries()]) {
      if (TIMESTAMP_PARAM_NAMES.has(name) && /^\d{10,}$/.test(value)) {
        replacements.push([name, value]);
      }
    }
    let normalized = url.toString();
    for (const [name, value] of replacements) {
      normalized = normalized.replace(
        `${name}=${encodeURIComponent(value)}`,
        `${name}=<timestamp>`
      );
    }
    return normalized;
  } catch {
    return rawUrl.replace(/([?&](?:_|timestamp|ts|t)=)\d{10,}/gi, '$1<timestamp>');
  }
}

/**
 * @param {HarQueryParam[]} [queryString]
 * @returns {HarQueryParam[]}
 */
function normalizeQueryString(queryString = []) {
  return queryString.map((param) => {
    const next = { ...param };
    if (TIMESTAMP_PARAM_NAMES.has(String(next.name)) && /^\d{10,}$/.test(String(next.value))) {
      next.value = '<timestamp>';
    }
    if (isSensitivePostField(next.name)) {
      next.value = REDACTED;
    }
    return next;
  });
}

/**
 * @overload
 * @param {HarHeader[]} [headers]
 * @returns {HarHeader[]}
 */
/**
 * @overload
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
/**
 * @param {HarHeader[] | Record<string, string>} [headers]
 * @returns {HarHeader[] | Record<string, string>}
 */
export function sanitizeHeaders(headers = []) {
  if (Array.isArray(headers)) {
    return headers.map((header) => ({
      ...header,
      value: redactSensitiveValue(header?.name, header?.value),
    }));
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, redactSensitiveValue(name, value)])
  );
}

/**
 * @param {HarFieldEntry} param
 * @returns {HarFieldEntry}
 */
function sanitizeParam(param) {
  return {
    ...param,
    value: isSensitivePostField(param?.name) ? REDACTED : param?.value,
  };
}

/**
 * @param {string} text
 * @returns {HarFieldEntry[] | null}
 */
function parseUrlEncoded(text) {
  const params = new URLSearchParams(text);
  if ([...params.keys()].length === 0) return null;
  return [...params.entries()].map(([name, value]) => ({ name, value }));
}

/**
 * @param {string} text
 * @returns {HarFieldEntry[] | Record<string, unknown> | null}
 */
function parseJsonPostText(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => (item && typeof item === 'object' ? sanitizeParam(item) : item));
    }
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed).map(([name, value]) => [
          name,
          isSensitivePostField(name) ? REDACTED : value,
        ])
      );
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {string} originalText
 * @param {HarFieldEntry[] | Record<string, unknown> | string | null | undefined} sanitizedValue
 * @returns {string}
 */
function serializeTextLikeOriginal(originalText, sanitizedValue) {
  if (typeof sanitizedValue === 'string') return sanitizedValue;
  if (Array.isArray(sanitizedValue) || sanitizedValue?.constructor === Object) {
    const trimmed = String(originalText).trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.stringify(sanitizedValue);
    }
    if (Array.isArray(sanitizedValue)) {
      return new URLSearchParams(
        sanitizedValue.map(({ name, value }) => [name, value ?? ''])
      ).toString();
    }
  }
  return originalText;
}

/**
 * @param {HarPostData | undefined} postData
 * @returns {HarPostData | undefined}
 */
export function sanitizePostData(postData) {
  if (!postData) return postData;
  const next = { ...postData };

  if (Array.isArray(next.params)) {
    next.params = next.params.map(sanitizeParam);
  }

  if (typeof next.text === 'string') {
    const json = parseJsonPostText(next.text);
    if (json) {
      next.text = serializeTextLikeOriginal(next.text, json);
    } else {
      const encoded = parseUrlEncoded(next.text);
      if (encoded) next.text = serializeTextLikeOriginal(next.text, encoded.map(sanitizeParam));
    }
  }

  return next;
}

/**
 * @param {HarEntry} entry
 * @param {SanitizeHarOptions} [options]
 * @returns {HarEntry}
 */
function sanitizeHarEntry(entry, options = {}) {
  const next = cloneJson(entry);
  if (!next?.request) return next;

  next.request.url = normalizeUrl(next.request.url);
  next.request.headers = sanitizeHeaders(next.request.headers ?? []);
  next.request.queryString = normalizeQueryString(next.request.queryString ?? []);
  next.request.postData = sanitizePostData(next.request.postData);

  if (next.response?.headers) {
    next.response.headers = sanitizeHeaders(next.response.headers);
  }

  if (options.stripResponseContentText && next.response?.content?.text) {
    next.response.content.text = '<response text stripped>';
  }

  return next;
}

/**
 * @param {HarLog} har
 * @param {SanitizeHarOptions} [options]
 * @returns {HarLog}
 */
export function sanitizeHar(har, options = {}) {
  const next = cloneJson(har);
  const entries = next?.log?.entries;
  if (!Array.isArray(entries)) return next;
  /** @type {NonNullable<typeof next.log>} */ (next.log).entries = entries.map((entry) =>
    sanitizeHarEntry(entry, options)
  );
  return next;
}

/**
 * @param {unknown} text
 * @returns {void}
 */
export function assertNoSensitiveHarContent(text) {
  const value = typeof text === 'string' ? text : JSON.stringify(text);
  const match = SENSITIVE_TEXT_PATTERNS.find((pattern) => pattern.test(value));
  if (match) {
    throw new Error(`Sensitive HAR content remains after sanitization: ${match}`);
  }
}

export { REDACTED };
