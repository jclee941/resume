import { normalizePostingLocations } from './ats-dry-run-locations.js';

/**
 * @typedef {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} FetchFunction
 */

/**
 * @typedef {Object} AtsDryRunOptions
 * @property {string} [boardToken]
 * @property {string} [company]
 * @property {string} [ashbyApiKey]
 * @property {FetchFunction} [fetch]
 */

/**
 * @typedef {Object} AtsPostingCriteria
 * @property {string} [boardToken]
 * @property {string} [company]
 * @property {string} [apiKey]
 */

/**
 * @typedef {Object} AtsDryRunJob
 * @property {string} id
 * @property {string | null} company
 * @property {string} position
 * @property {string} title
 * @property {string} source
 * @property {string} atsPlatform
 * @property {string | null} externalJobId
 * @property {string} sourceUrl
 * @property {string} applicationUrl
 * @property {string[]} normalizedLocations
 * @property {string[]} locationTargets
 * @property {boolean} remote
 * @property {boolean} dryRunOnly
 * @property {boolean} submissionSkipped
 */

/**
 * @typedef {AtsDryRunJob & { sourceId: string, description: string, atsStub: boolean, adapterBacked: boolean, matchScore: number }} NormalizedAtsDryRunJob
 */

/**
 * @typedef {Object} CreateJobParams
 * @property {string} platform
 * @property {AtsDryRunOptions} options
 * @property {string | number | null | undefined} externalJobId
 * @property {unknown} title
 * @property {unknown} sourceUrl
 * @property {unknown} [applicationUrl]
 * @property {string[]} normalizedLocations
 */

/**
 * @param {string} platform
 * @param {AtsDryRunOptions} [options]
 */
export function createDashboardAtsDryRunClient(platform, options = {}) {
  const fetchPostings = createPostingFetcher(platform, options);
  if (!fetchPostings) return null;

  return {
    /**
     * @param {string} keyword
     */
    async searchJobs(keyword) {
      const postings = await fetchPostings({
        boardToken: options.boardToken,
        company: options.company,
        apiKey: options.ashbyApiKey,
      });
      const jobs = postings
        .map((posting) => normalizePosting(platform, posting, options))
        .filter(
          /** @type {(job: AtsDryRunJob | null) => job is AtsDryRunJob} */ (
            (job) => job && job.normalizedLocations.length > 0
          )
        )
        .map((job) => normalizeAtsDryRunJob(job, platform, keyword));

      return { jobs };
    },
  };
}

/**
 * @param {string} platform
 * @param {AtsDryRunOptions} options
 * @returns {((criteria: AtsPostingCriteria) => Promise<unknown[]>) | null}
 */
function createPostingFetcher(platform, options) {
  if (!options.fetch) return null;
  /** @type {Record<string, (fetch: FetchFunction, criteria: AtsPostingCriteria) => Promise<unknown[]>>} */
  const fetchers = {
    greenhouse: fetchGreenhousePostings,
    lever: fetchLeverPostings,
    ashby: fetchAshbyPostings,
  };
  const fetcher = fetchers[platform];
  return fetcher
    ? (criteria) => fetcher(/** @type {FetchFunction} */ (options.fetch), criteria)
    : null;
}

/**
 * @param {FetchFunction} fetch
 * @param {AtsPostingCriteria} criteria
 * @returns {Promise<unknown[]>}
 */
async function fetchGreenhousePostings(fetch, { boardToken, company }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const payload = /** @type {{ jobs?: unknown[] } | null} */ (
    await fetchJson(fetch, url, { method: 'GET' })
  );
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}

/**
 * @param {FetchFunction} fetch
 * @param {AtsPostingCriteria} criteria
 * @returns {Promise<unknown[]>}
 */
async function fetchLeverPostings(fetch, { boardToken, company }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const payload = /** @type {unknown[] | { postings?: unknown[] } | null} */ (
    await fetchJson(fetch, url, { method: 'GET' })
  );
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.postings) ? payload.postings : [];
}

/**
 * @param {FetchFunction} fetch
 * @param {AtsPostingCriteria} criteria
 * @returns {Promise<unknown[]>}
 */
async function fetchAshbyPostings(fetch, { boardToken, company, apiKey }) {
  const token = normalizeBoardToken(boardToken ?? company);
  if (!token) return [];

  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
  /** @type {Record<string, string>} */
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const payload = /** @type {unknown[] | { jobs?: unknown[] } | null} */ (
    await fetchJson(fetch, url, { method: 'GET', headers })
  );
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.jobs) ? payload.jobs : [];
}

/**
 * @param {FetchFunction} fetch
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<unknown>}
 */
async function fetchJson(fetch, url, init) {
  const response = await fetch(url, init);
  if (!response?.ok) return {};
  return response.json();
}

/**
 * @param {string} platform
 * @param {unknown} posting
 * @param {AtsDryRunOptions} options
 * @returns {AtsDryRunJob | null}
 */
function normalizePosting(platform, posting, options) {
  if (!isRecord(posting)) return null;
  /** @type {Record<string, (posting: Record<string, unknown>, options: AtsDryRunOptions) => AtsDryRunJob | null>} */
  const normalizers = {
    greenhouse: normalizeGreenhousePosting,
    lever: normalizeLeverPosting,
    ashby: normalizeAshbyPosting,
  };
  const normalize = normalizers[platform];
  return normalize ? normalize(/** @type {Record<string, unknown>} */ (posting), options) : null;
}

/**
 * @param {Record<string, unknown>} posting
 * @param {AtsDryRunOptions} options
 */
function normalizeGreenhousePosting(posting, options) {
  return createJob({
    platform: 'greenhouse',
    options,
    externalJobId: /** @type {string | number | undefined} */ (
      posting.id ?? posting.internal_job_id
    ),
    title: posting.title,
    sourceUrl: posting.absolute_url,
    applicationUrl: posting.apply_url ?? posting.absolute_url,
    normalizedLocations: normalizePostingLocations([posting.location, posting.offices]),
  });
}

/**
 * @param {Record<string, unknown>} posting
 * @param {AtsDryRunOptions} options
 */
function normalizeLeverPosting(posting, options) {
  return createJob({
    platform: 'lever',
    options,
    externalJobId: /** @type {string | number | undefined} */ (posting.id),
    title: posting.text ?? posting.title,
    sourceUrl: posting.hostedUrl,
    applicationUrl: posting.applyUrl ?? posting.hostedUrl,
    normalizedLocations: normalizePostingLocations([posting.categories, posting.workplaceType]),
  });
}

/**
 * @param {Record<string, unknown>} posting
 * @param {AtsDryRunOptions} options
 */
function normalizeAshbyPosting(posting, options) {
  return createJob({
    platform: 'ashby',
    options,
    externalJobId: /** @type {string | number | undefined} */ (posting.id ?? posting.jobId),
    title: posting.title,
    sourceUrl: posting.jobUrl ?? posting.url,
    applicationUrl: posting.applyUrl ?? posting.applicationUrl ?? posting.jobUrl,
    normalizedLocations: normalizePostingLocations([posting.location, posting.locationName]),
  });
}

/**
 * @param {CreateJobParams} params
 * @returns {AtsDryRunJob | null}
 */
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

/**
 * @param {AtsDryRunJob} job
 * @param {string} platform
 * @param {string} keyword
 * @returns {NormalizedAtsDryRunJob}
 */
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

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeBoardToken(value) {
  const token = String(value ?? '')
    .trim()
    .toLowerCase();
  return token ? encodeURIComponent(token) : '';
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
