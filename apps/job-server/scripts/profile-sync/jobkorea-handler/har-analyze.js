const SAVE_PATH = '/User/Resume/Save';
const PORTFOLIO_PATH = '/User/Resume/AddUserFileDB';

/**
 * @typedef {{
 *   method: string | null;
 *   path: string | null;
 *   status: number | null;
 *   contentType: string | null;
 *   requiredHeaders: string[];
 *   requestFields: string[];
 *   requestFieldCount: number;
 *   hiddenFields: string[];
 *   responseShape: string | unknown[] | Record<string, unknown> | null;
 * }} HarRequestSummary
 */

/**
 * @param {import('./har-sanitize.js').HarLog | null | undefined} har
 * @returns {import('./har-sanitize.js').HarEntry[]}
 */
function getEntries(har) {
  return Array.isArray(har?.log?.entries) ? har.log.entries : [];
}

/**
 * @param {import('./har-sanitize.js').HarEntry} entry
 * @returns {URL | null}
 */
function getUrl(entry) {
  try {
    return new URL(entry.request.url);
  } catch {
    return null;
  }
}

/**
 * @param {import('./har-sanitize.js').HarHeader[]} headers
 * @param {string} name
 * @returns {string | undefined}
 */
function getHeaderValue(headers = [], name) {
  const header = headers.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return header?.value;
}

/**
 * @param {import('./har-sanitize.js').HarHeader[]} [headers]
 * @returns {string[]}
 */
function headerNames(headers = []) {
  return headers.map((header) => header.name).filter(Boolean);
}

/**
 * @param {import('./har-sanitize.js').HarEntry} entry
 * @returns {string | null}
 */
function requestContentType(entry) {
  return (
    getHeaderValue(entry.request?.headers ?? [], 'content-type') ??
    entry.request?.postData?.mimeType ??
    null
  );
}

/**
 * @param {import('./har-sanitize.js').HarEntry} entry
 * @returns {string | null}
 */
function responseContentType(entry) {
  return (
    entry.response?.content?.mimeType ??
    getHeaderValue(entry.response?.headers ?? [], 'content-type') ??
    null
  );
}

/**
 * @param {URL | null} url
 * @returns {string | null}
 */
function pathWithNormalizedQuery(url) {
  if (!url) return null;
  return `${url.pathname}${url.search}`;
}

/**
 * @param {import('./har-sanitize.js').HarPostData | undefined} postData
 * @returns {string[]}
 */
function decodePostFields(postData) {
  if (!postData) return [];
  if (Array.isArray(postData.params)) {
    return postData.params.map((field) => field.name).filter(Boolean);
  }
  if (typeof postData.text !== 'string') return [];

  const trimmed = postData.text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((field) => field?.name).filter(Boolean);
    if (parsed && typeof parsed === 'object') return Object.keys(parsed);
  } catch {
    // Try URLSearchParams next.
  }

  const params = new URLSearchParams(trimmed);
  return [...params.keys()];
}

/**
 * @param {string | undefined} text
 * @returns {unknown}
 */
function parseResponseText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * @param {unknown} value
 * @returns {string | unknown[] | Record<string, unknown>}
 */
function shapeOf(value) {
  if (value == null) return value === null ? 'null' : 'undefined';
  if (Array.isArray(value)) return value.length > 0 ? [shapeOf(value[0])] : [];
  if (typeof value !== 'object') return typeof value;
  return Object.fromEntries(
    Object.entries(/** @type {Record<string, unknown>} */ (value)).map(([key, child]) => [
      key,
      shapeOf(child),
    ])
  );
}

/**
 * @param {import('./har-sanitize.js').HarEntry} entry
 * @returns {string | unknown[] | Record<string, unknown> | null}
 */
function responseShape(entry) {
  const content = entry.response?.content;
  if (!content) return null;
  const parsed = parseResponseText(content.text);
  if (parsed == null) return responseContentType(entry) ?? null;
  return shapeOf(parsed);
}

/**
 * @param {string[]} fields
 * @returns {string[]}
 */
function hiddenFields(fields) {
  return fields.filter(
    (name) =>
      /^hdn/i.test(name) ||
      /(?:^|[._\]])(?:idx|id|no|r_no|stat|inputstat|attach_file_name)(?:$|[._[])/i.test(name)
  );
}

/**
 * @param {import('./har-sanitize.js').HarEntry} entry
 * @returns {HarRequestSummary}
 */
export function summarizeHarRequest(entry) {
  const url = getUrl(entry);
  const fields = decodePostFields(entry.request?.postData);
  return {
    method: entry.request?.method ?? null,
    path: pathWithNormalizedQuery(url),
    status: entry.response?.status ?? null,
    contentType: requestContentType(entry),
    requiredHeaders: headerNames(entry.request?.headers ?? []).filter((name) =>
      /^(content-type|x-requested-with|referer|origin|accept)$/i.test(name)
    ),
    requestFields: fields,
    requestFieldCount: fields.length,
    hiddenFields: hiddenFields(fields),
    responseShape: responseShape(entry),
  };
}

/**
 * @param {import('./har-sanitize.js').HarLog | null | undefined} har
 * @returns {import('./har-sanitize.js').HarEntry[]}
 */
export function findJobKoreaSaveRequests(har) {
  return getEntries(har).filter((entry) => {
    const url = getUrl(entry);
    return entry.request?.method === 'POST' && url?.pathname === SAVE_PATH;
  });
}

/**
 * @param {import('./har-sanitize.js').HarLog | null | undefined} har
 * @returns {import('./har-sanitize.js').HarEntry[]}
 */
export function findJobKoreaPortfolioRequests(har) {
  return getEntries(har).filter((entry) => {
    const url = getUrl(entry);
    return entry.request?.method === 'POST' && url?.pathname === PORTFOLIO_PATH;
  });
}

/**
 * @param {import('./har-sanitize.js').HarLog | null | undefined} har
 * @returns {import('./har-sanitize.js').HarEntry | undefined}
 */
function findEditEntry(har) {
  return getEntries(har).find((entry) => {
    const url = getUrl(entry);
    return (
      entry.request?.method === 'GET' &&
      /\/User\/Resume\/(?:Edit|Modify)/i.test(url?.pathname ?? '')
    );
  });
}

/**
 * @param {import('./har-sanitize.js').HarEntry | undefined} entry
 * @returns {HarRequestSummary | null}
 */
function endpointSummary(entry) {
  return entry ? summarizeHarRequest(entry) : null;
}

/**
 * @param {import('./har-sanitize.js').HarLog | null | undefined} har
 * @returns {Record<string, unknown>}
 */
export function analyzeJobKoreaHar(har) {
  const edit = endpointSummary(findEditEntry(har));
  const portfolio = endpointSummary(findJobKoreaPortfolioRequests(har)[0]);
  const save = endpointSummary(findJobKoreaSaveRequests(har)[0]);
  const saveEntry = findJobKoreaSaveRequests(har)[0];

  return {
    endpoints: {
      edit: edit
        ? {
            method: edit.method,
            path: edit.path,
            status: edit.status,
            contentType: edit.contentType,
          }
        : null,
      portfolio: portfolio
        ? {
            method: portfolio.method,
            path: portfolio.path,
            contentType: portfolio.contentType,
            requiredHeaders: portfolio.requiredHeaders,
            requestFields: portfolio.requestFields,
            responseShape: portfolio.responseShape,
          }
        : null,
      save: save
        ? {
            method: save.method,
            path: save.path?.split('?')[0] ?? save.path,
            query: saveEntry?.request?.url?.match(/\?[^#]*/)?.[0] ?? '',
            contentType: save.contentType,
            requiredHeaders: save.requiredHeaders,
            requestFieldCount: save.requestFieldCount,
            hiddenFields: save.hiddenFields,
            responseShape: save.responseShape,
          }
        : null,
    },
  };
}
