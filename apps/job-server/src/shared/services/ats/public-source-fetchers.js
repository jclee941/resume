export function createGreenhousePostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
    const payload = await fetchJson(fetch, url, { method: 'GET' });

    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  };
}

export function createLeverPostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
    const payload = await fetchJson(fetch, url, { method: 'GET' });

    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.postings) ? payload.postings : [];
  };
}

export function createAshbyPostingFetcher(fetch) {
  if (!fetch) return null;

  return async ({ boardToken, company, apiKey }) => {
    const token = normalizeBoardToken(boardToken ?? company);
    if (!token) return [];

    const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const payload = await fetchJson(fetch, url, { method: 'GET', headers });

    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  };
}

async function fetchJson(fetch, url, init) {
  const response = await fetch(url, init);

  if (!response?.ok) return [];
  return response.json();
}

function normalizeBoardToken(value) {
  const token = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!token) return '';

  return encodeURIComponent(token);
}
