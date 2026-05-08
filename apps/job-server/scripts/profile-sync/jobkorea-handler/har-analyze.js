const SAVE_PATH = '/User/Resume/Save';
const PORTFOLIO_PATH = '/User/Resume/AddUserFileDB';

function getEntries(har) {
  return Array.isArray(har?.log?.entries) ? har.log.entries : [];
}

function getUrl(entry) {
  try {
    return new URL(entry.request.url);
  } catch {
    return null;
  }
}

function getHeaderValue(headers = [], name) {
  const header = headers.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return header?.value;
}

function headerNames(headers = []) {
  return headers.map((header) => header.name).filter(Boolean);
}

function requestContentType(entry) {
  return getHeaderValue(entry.request?.headers ?? [], 'content-type') ?? entry.request?.postData?.mimeType ?? null;
}

function responseContentType(entry) {
  return entry.response?.content?.mimeType ?? getHeaderValue(entry.response?.headers ?? [], 'content-type') ?? null;
}

function pathWithNormalizedQuery(url) {
  if (!url) return null;
  return `${url.pathname}${url.search}`;
}

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

function parseResponseText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function shapeOf(value) {
  if (value == null) return value === null ? 'null' : 'undefined';
  if (Array.isArray(value)) return value.length > 0 ? [shapeOf(value[0])] : [];
  if (typeof value !== 'object') return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shapeOf(child)]));
}

function responseShape(entry) {
  const content = entry.response?.content;
  if (!content) return null;
  const parsed = parseResponseText(content.text);
  if (parsed == null) return responseContentType(entry) ?? null;
  return shapeOf(parsed);
}

function hiddenFields(fields) {
  return fields.filter(
    (name) =>
      /^hdn/i.test(name) ||
      /(?:^|[._\]])(?:idx|id|no|r_no|stat|inputstat|attach_file_name)(?:$|[._[])/i.test(name)
  );
}

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

export function findJobKoreaSaveRequests(har) {
  return getEntries(har).filter((entry) => {
    const url = getUrl(entry);
    return entry.request?.method === 'POST' && url?.pathname === SAVE_PATH;
  });
}

export function findJobKoreaPortfolioRequests(har) {
  return getEntries(har).filter((entry) => {
    const url = getUrl(entry);
    return entry.request?.method === 'POST' && url?.pathname === PORTFOLIO_PATH;
  });
}

function findEditEntry(har) {
  return getEntries(har).find((entry) => {
    const url = getUrl(entry);
    return entry.request?.method === 'GET' && /\/User\/Resume\/(?:Edit|Modify)/i.test(url?.pathname ?? '');
  });
}

function endpointSummary(entry) {
  return entry ? summarizeHarRequest(entry) : null;
}

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
