import {
  FOREIGN_ATS_LOCATION_TARGETS,
  normalizeForeignAtsSearchCriteria,
  normalizePostingLocations,
} from './location-normalizer.js';
import {
  createAshbyPostingFetcher,
  createGreenhousePostingFetcher,
  createLeverPostingFetcher,
} from './public-source-fetchers.js';

/**
 * @typedef {typeof globalThis.fetch} FetchFunction
 * @typedef {import('./public-source-fetchers.js').AtsPostingFetcher} AtsPostingFetcher
 *
 * @typedef {{
 *   fetch?: FetchFunction;
 *   httpFetch?: FetchFunction;
 *   greenhouse?: { fetch?: FetchFunction; fetchPostings?: AtsPostingFetcher | null };
 *   lever?: { fetch?: FetchFunction; fetchPostings?: AtsPostingFetcher | null };
 *   ashby?: { apiKey?: string; fetch?: FetchFunction; fetchPostings?: AtsPostingFetcher | null };
 *   ashbyApiKey?: string;
 * }} DefaultForeignAtsAdaptersOptions
 *
 * @typedef {{
 *   company?: string | null;
 *   boardToken?: string | null;
 *   locations?: string | string[];
 *   keywords?: string[];
 *   postings?: unknown[];
 *   [key: string]: unknown;
 * }} AtsSearchCriteria
 *
 * @typedef {{
 *   id: string;
 *   company: string | null;
 *   position: string;
 *   title: string;
 *   source: string;
 *   atsPlatform: string;
 *   externalJobId: string | null;
 *   sourceUrl: string;
 *   applicationUrl: string;
 *   normalizedLocations: (string | RegExp)[];
 *   locationTargets: (string | RegExp)[];
 *   remote: boolean;
 *   dryRunOnly: boolean;
 *   submissionSkipped: boolean;
 * }} NormalizedAtsJob
 *
 * @typedef {{
 *   platform: string;
 *   fetchPostings?: AtsPostingFetcher | null;
 *   apiKey?: string;
 *   backendApiKeyOnly?: boolean;
 *   normalizePosting: (posting: unknown, criteria: AtsSearchCriteria) => NormalizedAtsJob | null;
 * }} PostingAdapterConfig
 *
 * @typedef {{
 *   platform: string;
 *   capabilities: {
 *     locations: string[];
 *     dryRunFirst: boolean;
 *     canFetchNetwork: boolean;
 *     canSubmit: boolean;
 *     backendApiKeyOnly: boolean;
 *   };
 *   planSearch(criteria?: AtsSearchCriteria): Promise<{
 *     platform: string;
 *     keywords: unknown[];
 *     dryRun: boolean;
 *     locationTargets: (string | RegExp)[];
 *     unsupportedLocations: string[];
 *     networkSkipped: boolean;
 *     submissionSkipped: boolean;
 *   }>;
 *   search(criteria?: AtsSearchCriteria): Promise<NormalizedAtsJob[]>;
 * }} PublicPostingAdapter
 */

/**
 * @param {DefaultForeignAtsAdaptersOptions} [options]
 * @returns {{ greenhouse: PublicPostingAdapter; lever: PublicPostingAdapter; ashby: PublicPostingAdapter }}
 */
export function createDefaultForeignAtsAdapters(options = {}) {
  const sharedFetch = options.fetch ?? options.httpFetch;

  return {
    greenhouse: createPublicPostingAdapter({
      platform: 'greenhouse',
      fetchPostings:
        options.greenhouse?.fetchPostings ??
        createGreenhousePostingFetcher(
          /** @type {typeof globalThis.fetch} */ (options.greenhouse?.fetch ?? sharedFetch)
        ),
      normalizePosting: normalizeGreenhousePosting,
    }),
    lever: createPublicPostingAdapter({
      platform: 'lever',
      fetchPostings:
        options.lever?.fetchPostings ??
        createLeverPostingFetcher(
          /** @type {typeof globalThis.fetch} */ (options.lever?.fetch ?? sharedFetch)
        ),
      normalizePosting: normalizeLeverPosting,
    }),
    ashby: createPublicPostingAdapter({
      platform: 'ashby',
      apiKey: options.ashby?.apiKey ?? options.ashbyApiKey,
      backendApiKeyOnly: true,
      fetchPostings:
        options.ashby?.fetchPostings ??
        createAshbyPostingFetcher(
          /** @type {typeof globalThis.fetch} */ (options.ashby?.fetch ?? sharedFetch)
        ),
      normalizePosting: normalizeAshbyPosting,
    }),
  };
}

/**
 * @param {string} platform
 * @returns {PublicPostingAdapter}
 */
export function createBoundaryAdapter(platform) {
  return createPublicPostingAdapter({
    platform,
    normalizePosting: () => null,
  });
}

/**
 * @param {PostingAdapterConfig} config
 * @returns {PublicPostingAdapter}
 */
function createPublicPostingAdapter(config) {
  const platform = normalizePlatform(config.platform);

  return {
    platform,
    capabilities: createCapabilities(config),
    async planSearch(criteria = {}) {
      return {
        platform,
        ...normalizeForeignAtsSearchCriteria(criteria),
        networkSkipped: !config.fetchPostings,
        submissionSkipped: true,
      };
    },
    async search(criteria = {}) {
      const safeCriteria = isRecord(criteria) ? criteria : {};
      const plan = await this.planSearch(safeCriteria);
      const postings = await loadPostings(safeCriteria, config);

      return /** @type {NormalizedAtsJob[]} */ (
        postings
          .map((posting) => config.normalizePosting(posting, safeCriteria))
          .filter((job) => job && hasTargetLocation(job.normalizedLocations, plan.locationTargets))
      );
    },
  };
}

/**
 * @param {PostingAdapterConfig} config
 */
function createCapabilities(config) {
  return {
    locations: [...FOREIGN_ATS_LOCATION_TARGETS],
    dryRunFirst: true,
    canFetchNetwork: Boolean(config.fetchPostings),
    canSubmit: false,
    backendApiKeyOnly: config.backendApiKeyOnly === true,
  };
}

/**
 * @param {AtsSearchCriteria} criteria
 * @param {PostingAdapterConfig} config
 * @returns {Promise<unknown[]>}
 */
async function loadPostings(criteria, config) {
  if (Array.isArray(criteria.postings)) return criteria.postings;
  if (!config.fetchPostings) return [];

  const postings = await config.fetchPostings({
    company: criteria.company,
    boardToken: criteria.boardToken,
    apiKey: config.apiKey,
  });

  return Array.isArray(postings) ? postings : [];
}

/**
 * @param {unknown} posting
 * @param {AtsSearchCriteria} criteria
 * @returns {NormalizedAtsJob | null}
 */
function normalizeGreenhousePosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'greenhouse',
    criteria,
    externalJobId: posting.id ?? posting.internal_job_id,
    title: posting.title,
    sourceUrl: posting.absolute_url,
    applicationUrl: posting.apply_url ?? posting.absolute_url,
    normalizedLocations: normalizePostingLocations([posting.location, posting.offices]),
  });
}

/**
 * @param {unknown} posting
 * @param {AtsSearchCriteria} criteria
 * @returns {NormalizedAtsJob | null}
 */
function normalizeLeverPosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'lever',
    criteria,
    externalJobId: posting.id,
    title: posting.text ?? posting.title,
    sourceUrl: posting.hostedUrl,
    applicationUrl: posting.applyUrl ?? posting.hostedUrl,
    normalizedLocations: normalizePostingLocations([posting.categories, posting.workplaceType]),
  });
}

/**
 * @param {unknown} posting
 * @param {AtsSearchCriteria} criteria
 * @returns {NormalizedAtsJob | null}
 */
function normalizeAshbyPosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'ashby',
    criteria,
    externalJobId: posting.id ?? posting.jobId,
    title: posting.title,
    sourceUrl: posting.jobUrl ?? posting.url,
    applicationUrl: posting.applyUrl ?? posting.applicationUrl ?? posting.jobUrl,
    normalizedLocations: normalizePostingLocations([posting.location, posting.locationName]),
  });
}

/**
 * @param {{
 *   platform: string;
 *   criteria: AtsSearchCriteria;
 *   externalJobId?: unknown;
 *   title?: unknown;
 *   sourceUrl?: unknown;
 *   applicationUrl?: unknown;
 *   normalizedLocations: (string | RegExp)[];
 * }} params
 * @returns {NormalizedAtsJob | null}
 */
function createJob({
  platform,
  criteria,
  externalJobId,
  title,
  sourceUrl,
  applicationUrl,
  normalizedLocations,
}) {
  if (!title || !sourceUrl || normalizedLocations.length === 0) return null;

  return {
    id: `${platform}:${String(externalJobId ?? sourceUrl)}`,
    company: criteria.company ?? null,
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
 * @param {(string | RegExp)[]} normalizedLocations
 * @param {(string | RegExp)[]} locationTargets
 * @returns {boolean}
 */
function hasTargetLocation(normalizedLocations, locationTargets) {
  return normalizedLocations.some((location) => locationTargets.includes(location));
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} platform
 * @returns {string}
 */
function normalizePlatform(platform) {
  return String(platform).trim().toLowerCase();
}
