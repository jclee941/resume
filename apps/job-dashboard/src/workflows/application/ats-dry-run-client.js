import { normalizePostingLocations } from './ats-dry-run-locations.js';

export function createDashboardAtsDryRunClient(platform, options = {}) {
  const fetchPostings = createPostingFetcher(platform, options);
  if (!fetchPostings) return null;

  return {
    async searchJobs(keyword) {
      const postings = await fetchPostings({
        boardToken: options.boardToken,
        company: options.company,
        apiKey: options.ashbyApiKey,
      });
      const jobs = postings
        .map((posting) => normalizePosting(platform, posting, options))
        .filter((job) => job && job.normalizedLocations.length > 0)
        .map((job) => normalizeAtsDryRunJob(job, platform, keyword));

      return { jobs };
    },
  };
}

function createPostingFetcher(platform, options) {
  if (!options.fetch) return null;
  const fetchers = {
    greenhouse: fetchGreenhousePostings,
    lever: fetchLeverPostings,
    ashby: fetchAshbyPostings,
  };
  const fetcher = fetchers[platform];
  return fetcher ? (criteria) => fetcher(options.fetch, criteria) : null;
}

async function fetchGreenhousePostings(fetch, { boardToken, company }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const payload = await fetchJson(fetch, url, { method: 'GET' });
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}

async function fetchLeverPostings(fetch, { boardToken, company }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const payload = await fetchJson(fetch, url, { method: 'GET' });
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.postings) ? payload.postings : [];
}

async function fetchAshbyPostings(fetch, { boardToken, company, apiKey }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const payload = await fetchJson(fetch, url, { method: 'GET', headers });
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}

async function fetchJson(fetch, url, init) {
  const response = await fetch(url, init);
  if (!response?.ok) return {};
  return response.json();
}

function normalizePosting(platform, posting, options) {
  if (!isRecord(posting)) return null;
  const normalizers = {
    greenhouse: normalizeGreenhousePosting,
    lever: normalizeLeverPosting,
    ashby: normalizeAshbyPosting,
  };
  const normalize = normalizers[platform];
  return normalize ? normalize(posting, options) : null;
}

function normalizeGreenhousePosting(posting, options) {
  return createJob({
    platform: 'greenhouse',
    options,
    externalJobId: posting.id ?? posting.internal_job_id,
    title: posting.title,
    sourceUrl: posting.absolute_url,
    applicationUrl: posting.apply_url ?? posting.absolute_url,
    normalizedLocations: normalizePostingLocations([posting.location, posting.offices]),
  });
}

function normalizeLeverPosting(posting, options) {
  return createJob({
    platform: 'lever',
    options,
    externalJobId: posting.id,
    title: posting.text ?? posting.title,
    sourceUrl: posting.hostedUrl,
    applicationUrl: posting.applyUrl ?? posting.hostedUrl,
    normalizedLocations: normalizePostingLocations([posting.categories, posting.workplaceType]),
  });
}

function normalizeAshbyPosting(posting, options) {
  return createJob({
    platform: 'ashby',
    options,
    externalJobId: posting.id ?? posting.jobId,
    title: posting.title,
    sourceUrl: posting.jobUrl ?? posting.url,
    applicationUrl: posting.applyUrl ?? posting.applicationUrl ?? posting.jobUrl,
    normalizedLocations: normalizePostingLocations([posting.location, posting.locationName]),
  });
}

function createJob({
  platform,
  options,
  externalJobId,
  title,
  sourceUrl,
  applicationUrl,
  normalizedLocations,
}) {
  if (!title || !sourceUrl) return null;
  return {
    id: `${platform}:${String(externalJobId ?? sourceUrl)}`,
    company: options.company ?? null,
    position: String(title),
    title: String(title),
    source: platform,
    atsPlatform: platform,
    externalJobId: externalJobId === undefined ? null : String(externalJobId),
    sourceUrl: String(sourceUrl),
    applicationUrl: applicationUrl ? String(applicationUrl) : String(sourceUrl),
    normalizedLocations,
    locationTargets: normalizedLocations,
    remote: normalizedLocations.includes('remote'),
    dryRunOnly: true,
    submissionSkipped: true,
  };
}

function normalizeAtsDryRunJob(job, platform, keyword) {
  return {
    ...job,
    source: platform,
    sourceId: job.externalJobId || job.id,
    position: job.position || job.title,
    description: `${keyword} role discovered through ${platform} public adapter`,
    atsStub: true,
    adapterBacked: true,
    matchScore: 100,
  };
}

function normalizeBoardToken(value) {
  const token = String(value ?? '')
    .trim()
    .toLowerCase();
  return token ? encodeURIComponent(token) : '';
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
