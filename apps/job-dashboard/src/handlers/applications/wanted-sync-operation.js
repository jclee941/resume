import { extractWantedApplications, normalizeWantedApplication } from './wanted-history-mapper.js';

const WANTED_APPLICATIONS_URL = 'https://www.wanted.co.kr/api/v4/applications';

async function readOptionalJson(request) {
  if (typeof request.text === 'function') {
    const text = await request.text();
    if (!text.trim()) {
      return { body: {}, hasBody: false };
    }
    try {
      return { body: JSON.parse(text), hasBody: true };
    } catch {
      return { error: 'Invalid JSON', status: 400 };
    }
  }

  try {
    return { body: await request.json(), hasBody: true };
  } catch {
    return { body: {}, hasBody: false };
  }
}

function hasWantedApplicationsPayload(payload) {
  return (
    Array.isArray(payload) ||
    Array.isArray(payload?.applications) ||
    Array.isArray(payload?.data) ||
    Array.isArray(payload?.data?.applications)
  );
}

function buildWantedApplicationsUrl(request) {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  params.set('limit', url.searchParams.get('limit') || '50');
  params.set('offset', url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');
  if (status) {
    params.set('status', status);
  }
  return `${WANTED_APPLICATIONS_URL}?${params.toString()}`;
}

async function fetchWantedHistory(handler, request) {
  if (!handler.auth?.getCookies) {
    return { error: 'Wanted auth provider is not configured', status: 503 };
  }

  const cookies = await handler.auth.getCookies('wanted');
  if (!cookies) {
    return { error: 'Wanted session not found', status: 401 };
  }

  const response = await handler.fetcher(buildWantedApplicationsUrl(request), {
    headers: {
      Accept: 'application/json',
      Cookie: cookies,
      Referer: 'https://www.wanted.co.kr/',
    },
  });

  if (!response.ok) {
    return { error: `Wanted returned ${response.status}`, status: response.status };
  }

  return { payload: await response.json(), source: 'wanted-api' };
}

export async function syncWantedApplications(handler, request) {
  const parsed = await readOptionalJson(request);
  if (parsed.error) {
    return handler.jsonResponse({ error: parsed.error }, parsed.status);
  }

  const source =
    parsed.hasBody && hasWantedApplicationsPayload(parsed.body)
      ? { payload: parsed.body, source: 'request' }
      : await fetchWantedHistory(handler, request);

  if (source.error) {
    return handler.jsonResponse({ error: source.error }, source.status);
  }

  const rawApplications = extractWantedApplications(source.payload);
  const synced = [];
  for (const item of rawApplications) {
    let record;
    try {
      record = normalizeWantedApplication(item);
    } catch (error) {
      if (error instanceof TypeError) {
        return handler.jsonResponse(
          { error: 'Invalid Wanted application history item', details: error.message },
          400
        );
      }
      throw error;
    }
    await handler.wantedHistoryRepository.upsertHistory(record);
    await handler.wantedHistoryRepository.upsertApplication(record);
    synced.push({
      id: record.id,
      wantedApplicationId: record.wantedApplicationId,
      wantedJobId: record.wantedJobId,
      status: record.status,
    });
  }

  return handler.jsonResponse({
    success: true,
    source: source.source,
    imported: synced.length,
    applications: synced,
  });
}
